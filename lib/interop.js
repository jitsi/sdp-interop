"use strict";

var transform = require('./transform');
var arrayEquals = require('./array-equals');

function Interop() {

    /**
     * This map holds the most recent Unified Plan offer/answer SDP that was
     * converted to Plan B, with the SDP type ('offer' or 'answer') as keys and
     * the SDP string as values.
     *
     * @type {{}}
     */
    this.cache = {};
}

module.exports = Interop;


/**
 * This method transforms a Unified Plan SDP to an equivalent Plan B SDP. A
 * PeerConnection wrapper transforms the SDP to Plan B before passing it to the
 * application.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toPlanB = function(desc) {

    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    // Objectify the SDP for easier manipulation.
    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' ||
        !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Unified Plan SDP. Plan B
    // SDP has a video, an audio and a data "channel" at most.
    if (session.media.length <= 3 && session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Unified Plan.');
        return desc;
    }

    //#endregion

    // Unified Plan SDP is our "precious". Cache it for later use in the Plan B
    // -> Unified Plan transformation.
    this.cache[desc.type] = desc.sdp;

    //#region Convert from Unified Plan to Plan B.

    // We rebuild the session.media array.
    var media = session.media;
    session.media = [];

    // Associative array that maps channel types to channel objects for fast
    // access to channel objects by their type, e.g. type2bl['audio']->channel
    // obj.
    var type2bl = {};

    // Used to build the group:BUNDLE value after the channels construction
    // loop.
    var types = [];

    // Implode the Unified Plan m-lines/tracks into Plan B channels.
    media.forEach(function(unifiedLine) {

        // rtcp-mux is required in the Plan B SDP.
        if ((typeof unifiedLine.rtcpMux !== 'string' ||
            unifiedLine.rtcpMux !== 'rtcp-mux') &&
            unifiedLine.direction !== 'inactive') {
            throw new Error('Cannot convert to Plan B because m-lines ' +
                'without the rtcp-mux attribute were found.');
        }

        if (unifiedLine.type === 'application') {
            session.media.push(unifiedLine);
            types.push(unifiedLine.mid);
            return;
        }

        // If we don't have a channel for this unifiedLine.type, then use this unifiedLine
        // as the channel basis.
        if (typeof type2bl[unifiedLine.type] === 'undefined') {
            type2bl[unifiedLine.type] = unifiedLine;
        }

        // Add sources to the channel and handle a=msid.
        if (typeof unifiedLine.sources === 'object') {
            Object.keys(unifiedLine.sources).forEach(function(ssrc) {
                if (typeof type2bl[unifiedLine.type].sources !== 'object')
                    type2bl[unifiedLine.type].sources = {};

                // Assign the sources to the channel.
                type2bl[unifiedLine.type].sources[ssrc] = unifiedLine.sources[ssrc];

                if (typeof unifiedLine.msid !== 'undefined') {
                    // In Plan B the msid is an SSRC attribute. Also, we don't
                    // care about the obsolete label and mslabel attributes.
                    //
                    // Note that it is not guaranteed that the unifiedLine will have
                    // an msid. recvonly channels in particular don't have one.
                    type2bl[unifiedLine.type].sources[ssrc].msid = unifiedLine.msid;
                }
                // NOTE ssrcs in ssrc groups will share msids, as
                // draft-uberti-rtcweb-plan-00 mandates.
            });
        }

        // Add ssrc groups to the channel.
        if (typeof unifiedLine.ssrcGroups !== 'undefined' &&
                Array.isArray(unifiedLine.ssrcGroups)) {

            // Create the ssrcGroups array, if it's not defined.
            if (typeof type2bl[unifiedLine.type].ssrcGroups === 'undefined' ||
                    !Array.isArray(type2bl[unifiedLine.type].ssrcGroups)) {
                type2bl[unifiedLine.type].ssrcGroups = [];
            }

            type2bl[unifiedLine.type].ssrcGroups = type2bl[unifiedLine.type].ssrcGroups.concat(unifiedLine.ssrcGroups);
        }

        if (type2bl[unifiedLine.type] === unifiedLine) {
            // Copy ICE related stuff from the principal media line.
            unifiedLine.candidates = media[0].candidates;
            unifiedLine.iceUfrag = media[0].iceUfrag;
            unifiedLine.icePwd = media[0].icePwd;
            unifiedLine.fingerprint = media[0].fingerprint;

            // Plan B mids are in ['audio', 'video', 'data']
            unifiedLine.mid = unifiedLine.type;

            // Plan B doesn't support/need the bundle-only attribute.
            delete unifiedLine.bundleOnly;

            // In Plan B the msid is an SSRC attribute.
            delete unifiedLine.msid;

            // Used to build the group:BUNDLE value after this loop.
            types.push(unifiedLine.type);

            // Add the channel to the new media array.
            session.media.push(unifiedLine);
        }
    });

    // We regenerate the BUNDLE group with the new mids.
    session.groups.some(function(group) {
        if (group.type === 'BUNDLE') {
            group.mids = types.join(' ');
            return true;
        }
    });

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};

/**
 * This method transforms a Plan B SDP to an equivalent Unified Plan SDP. A
 * PeerConnection wrapper transforms the SDP to Unified Plan before passing it
 * to FF.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toUnifiedPlan = function(desc) {

    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' ||
        !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Plan B SDP. Plan B SDP has
    // a video, an audio and a data "channel" at most.
    if (session.media.length > 3 || !session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Plan B.');
        return desc;
    }

    // Make sure this Plan B SDP can be converted to a Unified Plan SDP.
    var mids = [];
    session.media.forEach(function(m) {
        mids.push(m.mid);
    });

    var hasBundle = false;
    if (typeof session.groups !== 'undefined' &&
        Array.isArray(session.groups)) {
        hasBundle = session.groups.every(function(g) {
            return g.type !== 'BUNDLE' ||
                arrayEquals.apply(g.mids.sort(), [mids.sort()]);
        });
    }

    if (!hasBundle) {
        throw new Error("Cannot convert to Unified Plan because m-lines that" +
            " are not bundled were found.");
    }

    //#endregion


    //#region Convert from Plan B to Unified Plan.

    // Unfortunately, a Plan B offer/answer doesn't have enough information to
    // rebuild an equivalent Unified Plan offer/answer.
    //
    // For example, if this is a local answer (in Unified Plan style) that we
    // convert to Plan B prior to handing it over to the application (the
    // PeerConnection wrapper called us, for instance, after a successful
    // createAnswer), we want to remember the m-line at which we've seen the
    // (local) SSRC. That's because when the application wants to do call the
    // SLD method, forcing us to do the inverse transformation (from Plan B to
    // Unified Plan), we need to know to which m-line to assign the (local)
    // SSRC. We also need to know all the other m-lines that the original
    // answer had and include them in the transformed answer as well.
    //
    // Another example is if this is a remote offer that we convert to Plan B
    // prior to giving it to the application, we want to remember the mid at
    // which we've seen the (remote) SSRC.
    //
    // In the iteration that follows, we use the cached Unified Plan (if it
    // exists) to assign mids to ssrcs.

    var cached;
    if (typeof this.cache[desc.type] !== 'undefined') {
        cached = transform.parse(this.cache[desc.type]);
    }

    // A helper map that sends mids to m-line objects. We use it later to
    // rebuild the Unified Plan style session.media array.
    var mid2ul = {};
    session.media.forEach(function(bLine) {
        if ((typeof bLine.rtcpMux !== 'string' ||
            bLine.rtcpMux !== 'rtcp-mux') &&
            bLine.direction !== 'inactive') {
            throw new Error("Cannot convert to Unified Plan because m-lines " +
                "without the rtcp-mux attribute were found.");
        }

        if (bLine.type === 'application') {
            mid2ul[bLine.mid] = bLine;
            return;
        }

        // With rtcp-mux and bundle all the channels should have the same ICE
        // stuff.
        var sources = bLine.sources;
        var ssrcGroups = bLine.ssrcGroups;
        var candidates = bLine.candidates;
        var iceUfrag = bLine.iceUfrag;
        var icePwd = bLine.icePwd;
        var fingerprint = bLine.fingerprint;
        var port = bLine.port;

        // We'll use the "bLine" object as a prototype for each new "mLine"
        // that we create, but first we need to clean it up a bit.
        delete bLine.sources;
        delete bLine.ssrcGroups;
        delete bLine.candidates;
        delete bLine.iceUfrag;
        delete bLine.icePwd;
        delete bLine.fingerprint;
        delete bLine.port;
        delete bLine.mid;

        // inverted ssrc group map
        var ssrc2group = {};
        if (typeof ssrcGroups !== 'undefined' && Array.isArray(ssrcGroups)) {
            ssrcGroups.forEach(function (ssrcGroup) {

                // TODO(gp) find out how to receive simulcast with FF. For the
                // time being, hide it.
                if (ssrcGroup.semantics === 'SIM') {
                    return;
                }

                if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                    Array.isArray(ssrcGroup.ssrcs)) {
                    ssrcGroup.ssrcs.forEach(function (ssrc) {
                        if (typeof ssrc2group[ssrc] === 'undefined') {
                            ssrc2group[ssrc] = [];
                        }

                        ssrc2group[ssrc].push(ssrcGroup);
                    });
                }
            });
        }

        // ssrc to m-line index.
        var ssrc2ml = {};

        if (typeof sources === 'object') {

            // Explode the Plan B channel sources with one m-line per source.
            Object.keys(sources).forEach(function(ssrc) {

                // The (unified) m-line for this SSRC. We either create it from
                // scratch or, if it's a grouped SSRC, we re-use a related
                // mline. In other words, if the source is grouped with another
                // source, put the two together in the same m-line.
                var unifiedLine;
                if (typeof ssrc2group[ssrc] !== 'undefined' &&
                    Array.isArray(ssrc2group[ssrc])) {
                    ssrc2group[ssrc].some(function (ssrcGroup) {
                        // ssrcGroup.ssrcs *is* an Array, no need to check
                        // again here.
                        return ssrcGroup.ssrcs.some(function (related) {
                            if (typeof ssrc2ml[related] === 'object') {
                                unifiedLine = ssrc2ml[related];
                                return true;
                            }
                        });
                    });
                }

                if (typeof unifiedLine === 'object') {
                    // the m-line already exists. Just add the source.
                    unifiedLine.sources[ssrc] = sources[ssrc];
                    delete sources[ssrc].msid;
                } else {
                    // Use the "bLine" as a prototype for the "unifiedLine".
                    unifiedLine = Object.create(bLine);
                    ssrc2ml[ssrc] = unifiedLine;

                    if (typeof sources[ssrc].msid !== 'undefined') {
                        // Assign the msid of the source to the m-line. Note
                        // that it is not guaranteed that the source will have
                        // msid. In particular "recvonly" sources don't have an
                        // msid. Note that "recvonly" is a term only defined
                        // for m-lines.
                        unifiedLine.msid = sources[ssrc].msid;
                        delete sources[ssrc].msid;
                    }

                    // We assign one SSRC per media line.
                    unifiedLine.sources = {};
                    unifiedLine.sources[ssrc] = sources[ssrc];
                    unifiedLine.ssrcGroups = ssrc2group[ssrc];

                    // Use the cached Unified Plan SDP (if it exists) to assign
                    // SSRCs to mids.
                    if (typeof cached !== 'undefined' &&
                        typeof cached.media !== 'undefined' &&
                        Array.isArray(cached.media)) {

                        cached.media.forEach(function (m) {
                            if (typeof m.sources === 'object') {
                                Object.keys(m.sources).forEach(function (s) {
                                    if (s === ssrc) {
                                        unifiedLine.mid = m.mid;
                                    }
                                });
                            }
                        });
                    }

                    if (typeof unifiedLine.mid === 'undefined') {

                        // If this is an SSRC that we see for the first time
                        // assign it a new mid. This is typically the case when
                        // this method is called to transform a remote
                        // description for the first time or when there is a
                        // new SSRC in the remote description because a new
                        // peer has joined the conference. Local SSRCs should
                        // have already been added to the map in the toPlanB
                        // method.
                        //
                        // Because FF generates answers in Unified Plan style,
                        // we MUST already have a cached answer with all the
                        // local SSRCs mapped to some m-line/mid.

                        if (desc.type === 'answer') {
                            throw new Error("An unmapped SSRC was found.");
                        }

                        unifiedLine.mid = [bLine.type, '-', ssrc].join('');
                    }

                    // Include the candidates in the 1st media line.
                    unifiedLine.candidates = candidates;
                    unifiedLine.iceUfrag = iceUfrag;
                    unifiedLine.icePwd = icePwd;
                    unifiedLine.fingerprint = fingerprint;
                    unifiedLine.port = port;

                    mid2ul[unifiedLine.mid] = unifiedLine;
                }
            });
        }
    });

    // Rebuild the media array in the right order and add the missing mLines
    // (missing from the Plan B SDP).
    session.media = [];
    mids = []; // reuse

    if (desc.type === 'answer') {

        // The media lines in the answer must match the media lines in the
        // offer. The order is important too. Here we assume that Firefox is the
        // answerer, so we merely have to use the reconstructed (unified) answer
        // to update the cached (unified) answer accordingly.
        //
        // In the general case, one would have to use the cached (unified) offer
        // to find the m-lines that are missing from the reconstructed answer,
        // potentially grabbing them from the cached (unified) answer. One has
        // to be carefull with this approach because inactive m-lines do not
        // always have an mid, making it tricky (impossible?) to find where
        // exactly and which m-lines are missing from the reconstructed answer.

        for (var i = 0; i < cached.media.length; i++) {
            var unifiedLine = cached.media[i];

            if (typeof mid2ul[unifiedLine.mid] === 'undefined') {

                // The mid isn't in the reconstructed (unified) answer.
                // This is either a (unified) m-line containing a remote
                // track only, or a (unified) m-line containing a remote
                // track and a local track that has been removed.
                // In either case, it MUST exist in the cached
                // (unified) answer.
                //
                // In case this is a removed local track, clean-up
                // the (unified) m-line and make sure it's 'recvonly' or
                // 'inactive'.

                delete unifiedLine.msid;
                delete unifiedLine.sources;
                delete unifiedLine.ssrcGroups;
                if (!unifiedLine.direction
                    || unifiedLine.direction === 'sendrecv')
                    unifiedLine.direction = 'recvonly';
                if (!unifiedLine.direction
                    || unifiedLine.direction === 'sendonly')
                    unifiedLine.direction = 'inactive';
            } else {
                // This is an (unified) m-line/channel that contains a local
                // track (sendrecv or sendonly channel) or it's a unified
                // recvonly m-line/channel. In either case, since we're
                // going from PlanB -> Unified Plan this m-line MUST
                // exist in the cached answer.
            }

            session.media.push(unifiedLine);

            if (typeof unifiedLine.mid === 'string') {
                // inactive lines don't/may not have an mid.
                mids.push(unifiedLine.mid);
            }
        }
    } else {

        // SDP offer/answer (and the JSEP spec) forbids removing an m-section
        // under any circumstances. If we are no longer interested in sending a
        // track, we just remove the msid and ssrc attributes and set it to
        // either a=recvonly (as the reofferer, we must use recvonly if the
        // other side was previously sending on the m-section, but we can also
        // leave the possibility open if it wasn't previously in use), or
        // a=inacive.

        if (typeof cached !== 'undefined' &&
            typeof cached.media !== 'undefined' &&
            Array.isArray(cached.media)) {
            cached.media.forEach(function(unifiedLine) {
                mids.push(unifiedLine.mid);
                if (typeof mid2ul[unifiedLine.mid] !== 'undefined') {
                    session.media.push(mid2ul[unifiedLine.mid]);
                } else {
                    delete unifiedLine.msid;
                    delete unifiedLine.sources;
                    delete unifiedLine.ssrcGroups;
                    if (!unifiedLine.direction
                        || unifiedLine.direction === 'sendrecv')
                        unifiedLine.direction = 'recvonly';
                    if (!unifiedLine.direction
                        || unifiedLine.direction === 'sendonly')
                        unifiedLine.direction = 'inactive';
                    session.media.push(unifiedLine);
                }
            });
        }

        // Add all the remaining (new) m-lines of the transformed SDP.
        Object.keys(mid2ul).forEach(function(mid) {
            if (mids.indexOf(mid) === -1) {
                mids.push(mid);
                if (typeof mid2ul[mid].direction === 'recvonly') {
                    // This is a remote recvonly channel. Add its SSRC to the
                    // appropriate sendrecv or sendonly channel.
                    // TODO(gp) what if we don't have sendrecv/sendonly channel?
                    session.media.some(function (unifiedLine) {
                        if ((unifiedLine.direction === 'sendrecv' ||
                            unifiedLine.direction === 'sendonly') &&
                            unifiedLine.type === mid2ul[mid].type) {

                            // mid2ul[mid] shouldn't have any ssrc-groups
                            Object.keys(mid2ul[mid].sources).forEach(function (ssrc) {
                                unifiedLine.sources[ssrc] = mid2ul[mid].sources[ssrc];
                            });

                            return true;
                        }
                    });
                } else {
                    session.media.push(mid2ul[mid]);
                }
            }
        });
    }

    // We regenerate the BUNDLE group (since we regenerated the mids)
    session.groups.some(function(group) {
        if (group.type === 'BUNDLE') {
            group.mids = mids.join(' ');
            return true;
        }
    });

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    // Cache the transformed SDP (Unified Plan) for later re-use in this
    // function.
    this.cache[desc.type] = resStr;

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};
