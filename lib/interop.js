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
    // access to channel objects by their type, e.g. channels['audio']->channel
    // obj.
    var channels = {};

    // Used to build the group:BUNDLE value after the channels construction
    // loop.
    var types = [];

    // Implode the Unified Plan m-lines/tracks into Plan B "channels".
    media.forEach(function(mLine) {

        // rtcp-mux is required in the Plan B SDP.
        if (typeof mLine.rtcpMux !== 'string' ||
            mLine.rtcpMux !== 'rtcp-mux') {
            throw new Error('Cannot convert to Plan B because m-lines ' +
                'without the rtcp-mux attribute were found.');
        }

        // If we don't have a channel for this mLine.type, then use this mLine
        // as the channel basis.
        if (typeof channels[mLine.type] === 'undefined') {
            channels[mLine.type] = mLine;
        }

        // Add sources to the channel and handle a=msid.
        if (typeof mLine.sources === 'object') {
            Object.keys(mLine.sources).forEach(function(ssrc) {
                if (typeof channels[mLine.type].sources !== 'object')
                    channels[mLine.type].sources = {};

                // Assign the sources to the channel.
                channels[mLine.type].sources[ssrc] = mLine.sources[ssrc];

                if (typeof mLine.msid !== 'undefined') {
                    // In Plan B the msid is an SSRC attribute. Also, we don't
                    // care about the obsolete label and mslabel attributes.
                    //
                    // Note that it is not guaranteed that the mLine will have
                    // an msid. recvonly channels in particular don't have one.
                    channels[mLine.type].sources[ssrc].msid = mLine.msid;
                }
                // NOTE ssrcs in ssrc groups will share msids, as
                // draft-uberti-rtcweb-plan-00 mandates.
            });
        }

        // Add ssrc groups to the channel.
        if (typeof mLine.ssrcGroups !== 'undefined' &&
                Array.isArray(mLine.ssrcGroups)) {

            // Create the ssrcGroups array, if it's not defined.
            if (typeof channels[mLine.type].ssrcGroups === 'undefined' ||
                    !Array.isArray(channels[mLine.type].ssrcGroups)) {
                channels[mLine.type].ssrcGroups = [];
            }

            channels[mLine.type].ssrcGroups = channels[mLine.type].ssrcGroups.concat(mLine.ssrcGroups);
        }

        if (channels[mLine.type] === mLine) {
            // Copy ICE related stuff from the principal media line.
            mLine.candidates = media[0].candidates;
            mLine.iceUfrag = media[0].iceUfrag;
            mLine.icePwd = media[0].icePwd;
            mLine.fingerprint = media[0].fingerprint;

            // Plan B mids are in ['audio', 'video', 'data']
            mLine.mid = mLine.type;

            // Plan B doesn't support/need the bundle-only attribute.
            delete mLine.bundleOnly;

            // In Plan B the msid is an SSRC attribute.
            delete mLine.msid;

            // Used to build the group:BUNDLE value after this loop.
            types.push(mLine.type);

            // Add the channel to the new media array.
            session.media.push(mLine);
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
    var media = {};
    session.media.forEach(function(channel) {
        if (typeof channel.rtcpMux !== 'string' ||
            channel.rtcpMux !== 'rtcp-mux') {
            throw new Error("Cannot convert to Unified Plan because m-lines " +
                "without the rtcp-mux attribute were found.");
        }

        // With rtcp-mux and bundle all the channels should have the same ICE
        // stuff.
        var sources = channel.sources;
        var ssrcGroups = channel.ssrcGroups;
        var candidates = channel.candidates;
        var iceUfrag = channel.iceUfrag;
        var icePwd = channel.icePwd;
        var fingerprint = channel.fingerprint;
        var port = channel.port;

        // We'll use the "channel" object as a prototype for each new "mLine"
        // that we create, but first we need to clean it up a bit.
        delete channel.sources;
        delete channel.ssrcGroups;
        delete channel.candidates;
        delete channel.iceUfrag;
        delete channel.icePwd;
        delete channel.fingerprint;
        delete channel.port;
        delete channel.mid;

        // inverted ssrc group map
        var invertedGroups = {};
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
                        if (typeof invertedGroups[ssrc] === 'undefined') {
                            invertedGroups[ssrc] = [];
                        }

                        invertedGroups[ssrc].push(ssrcGroup);
                    });
                }
            });
        }

        // ssrc to m-line index.
        var mLines = {};

        if (typeof sources === 'object') {

            // Explode the Plan B channel sources with one m-line per source.
            Object.keys(sources).forEach(function(ssrc) {

                var mLine;
                if (typeof invertedGroups[ssrc] !== 'undefined' &&
                    Array.isArray(invertedGroups[ssrc])) {
                    invertedGroups[ssrc].some(function (ssrcGroup) {
                        // ssrcGroup.ssrcs *is* an Array, no need to check
                        // again here.
                        return ssrcGroup.ssrcs.some(function (related) {
                            if (typeof mLines[related] === 'object') {
                                mLine = mLines[related];
                                return true;
                            }
                        });
                    });
                }

                if (typeof mLine === 'object') {
                    // the m-line already exists. Just add the source.
                    mLine.sources[ssrc] = sources[ssrc];
                    delete sources[ssrc].msid;
                } else {
                    // Use the "channel" as a prototype for the "mLine".
                    mLine = Object.create(channel);
                    mLines[ssrc] = mLine;

                    if (typeof sources[ssrc].msid !== 'undefined') {
                        // Assign the msid of the source to the m-line. Note
                        // that it is not guaranteed that the source will have
                        // msid. In particular "recvonly" sources don't have an
                        // msid. Note that "recvonly" is a term only defined
                        // for m-lines.
                        mLine.msid = sources[ssrc].msid;
                        delete sources[ssrc].msid;
                    }

                    // We assign one SSRC per media line.
                    mLine.sources = {};
                    mLine.sources[ssrc] = sources[ssrc];
                    mLine.ssrcGroups = invertedGroups[ssrc];

                    // Use the cached Unified Plan SDP (if it exists) to assign
                    // SSRCs to mids.
                    if (typeof cached !== 'undefined' &&
                        typeof cached.media !== 'undefined' &&
                        Array.isArray(cached.media)) {

                        cached.media.forEach(function(m) {
                            if (typeof m.sources === 'object') {
                                Object.keys(m.sources).forEach(function(s) {
                                    if (s === ssrc) {
                                        mLine.mid = m.mid;
                                    }
                                });
                            }
                        });
                    }

                    if (typeof mLine.mid === 'undefined') {

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
                        // local SSRCs mapped to some mLine/mid.

                        if (desc.type === 'answer') {
                            throw new Error("An unmapped SSRC was found.");
                        }

                        mLine.mid = [channel.type, '-', ssrc].join('');
                    }

                    // Include the candidates in the 1st media line.
                    mLine.candidates = candidates;
                    mLine.iceUfrag = iceUfrag;
                    mLine.icePwd = icePwd;
                    mLine.fingerprint = fingerprint;
                    mLine.port = port;

                    media[mLine.mid] = mLine;
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
        // offer. The order is important too. Here we use the cached offer to
        // find the m-lines that are missing (from the converted answer), and
        // use the cached answer to complete the converted answer.

        if (typeof this.cache['offer'] === 'undefined') {
            throw new Error("An answer is being processed but we couldn't " +
                    "find a cached offer.");
        }

        var cachedOffer = transform.parse(this.cache['offer']);

        if (typeof cachedOffer === 'undefined' ||
            typeof cachedOffer.media === 'undefined' ||
            !Array.isArray(cachedOffer.media)) {
                // FIXME(gp) is this really a problem in the general case?
                throw new Error("The cached offer has no media.");
        }

        cachedOffer.media.forEach(function(mo) {

            var mLine;
            cached.media.some(function(ma) {
                if (mo.mid == ma.mid) {
                    if (typeof media[mo.mid] === 'undefined') {

                        // This is either an m-line containing a remote
                        // track only, or an m-line containing a remote
                        // track and a local track that has been removed.
                        // In either case, it MUST exist in the cached
                        // answer.
                        //
                        // In case this is a removed local track, clean-up
                        // the m-line and make sure it's 'recvonly'.

                        // TODO sendonly -> inactive makes more sense.
                        delete ma.msid;
                        delete ma.sources;
                        delete ma.ssrcGroups;
                        if (!ma.direction
                            || ma.direction === 'sendonly'
                            || ma.direction === 'sendrecv')
                            ma.direction = 'recvonly';
                    } else {
                        // This is an m-line/channel that contains a local
                        // track (sendrecv or sendonly channel) or it's a
                        // recvonly m-line/channel. In either case, since we're
                        // going from PlanB -> Unified Plan this m-line MUST
                        // exist in the cached answer.
                    }

                    // assign the found object.
                    mLine = ma;
                    return true;
                }
            });

            if (typeof mLine === 'undefined') {
                throw new Error("The cached offer contains an m-line that " +
                        "doesn't exist neither in the cached answer nor in " +
                        "the converted answer.");
            }

            session.media.push(mLine);
            mids.push(mLine.mid);
        });
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
            cached.media.forEach(function(pm) {
                mids.push(pm.mid);
                if (typeof media[pm.mid] !== 'undefined') {
                    session.media.push(media[pm.mid]);
                } else {
                    delete pm.msid;
                    delete pm.sources;
                    delete pm.ssrcGroups;
                    pm.direction = 'recvonly';
                    session.media.push(pm);
                }
            });
        }

        // Add all the remaining (new) m-lines of the transformed SDP.
        Object.keys(media).forEach(function(mid) {
            if (mids.indexOf(mid) === -1) {
                mids.push(mid);
                session.media.push(media[mid]);
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
