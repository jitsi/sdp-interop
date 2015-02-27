var transform = require('sdp-transform');
var arrayEquals = require('./array-equals');

function Interop() { }
module.exports = Interop;

/**
 * This map holds the most recent Plan A offer/answer SDP that was converted
 * to Plan B, with the SDP type ('offer' or 'answer') as keys and the SDP
 * string as values.
 *
 * @type {{}}
 */
var cache = {};

/**
 * This method transforms a Plan A SDP to an equivalent Plan B SDP. A
 * PeerConnection wrapper transforms the SDP to Plan B before passing it to the
 * application.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toPlanB = function(desc) {

    //#region Input validation.

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

    // Try some heuristics to "make sure" this is a Plan A SDP. Plan B SDP has
    // a video, an audio and a data "channel" at most.
    if (session.media.length <= 3 && session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Plan A.');
        return desc;
    }

    //#endregion

    // Plan A SDP is our "precious". Cache it for later use in the Plan B ->
    // Plan A transformation.
    cache[desc.type] = desc.sdp;

    //#region Convert from Plan A to Plan B.

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

    // Implode the Plan A m-lines/tracks into Plan B "channels".
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
                // Assign the sources to the channel.
                channels[mLine.type].sources[ssrc] = mLine.sources[ssrc];

                // In Plan B the msid is an SSRC attribute.
                channels[mLine.type].sources[ssrc].msid = mLine.msid;
            });
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

        // TODO(gp) add support for ssrc-group.
    });

    // We regenerate the BUNDLE group with the new mids.
    session.groups.every(function(group) {
        if (group.type === 'BUNDLE') {
            group.mids = types.join(' ');
            return false;
        } else {
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
 * This method transforms a Plan B SDP to an equivalent Plan A SDP. A
 * PeerConnection wrapper transforms the SDP to Plan A before passing it to FF.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toPlanA = function(desc) {

    //#region Input validation.

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

    // Make sure this Plan B SDP can be converted to a Plan A SDP.
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
        throw new Error("Cannot convert to Plan A because m-lines that are " +
            "not bundled were found.");
    }

    //#endregion


    //#region Convert from Plan B to Plan A.

    // Unfortunately, a Plan B offer/answer doesn't have enough information to
    // rebuild an equivalent Plan A offer/answer.
    //
    // For example, if this is a local answer (in Plan A style) that we convert
    // to Plan B prior to handing it over to the application (the
    // PeerConnection wrapper called us, for instance, after a successful
    // createAnswer), we want to remember the m-line at which we've seen the
    // (local) SSRC. That's because when the application wants to do call the
    // SLD method, forcing us to do the inverse transformation (from Plan B to
    // Plan A), we need to know to which m-line to assign the (local) SSRC. We
    // also need to know all the other m-lines that the original answer had and
    // include them in the transformed answer as well.
    //
    // Another example is if this is a remote offer that we convert to Plan B
    // prior to giving it to the application, we want to remember the mid at
    // which we've seen the (remote) SSRC.
    //
    // In the iteration that follows, we use the cached Plan A (if it exists)
    // to assign mids to ssrcs.

    var cached;
    if (typeof cache[desc.type] !== 'undefined') {
        cached = transform.parse(cache[desc.type]);
    }

    // A helper map that sends mids to m-line objects. We use it later to
    // rebuild the Plan A style session.media array.
    var media = {};
    session.media.forEach(function(channel) {
        if (typeof channel.rtcpMux !== 'string' ||
            channel.rtcpMux !== 'rtcp-mux') {
            throw new Error("Cannot convert to Plan A because m-lines " +
                "without the rtcp-mux attribute were found.");
        }

        // With rtcp-mux and bundle all the channels should have the same ICE
        // stuff.
        var sources = channel.sources;
        var candidates = channel.candidates;
        var iceUfrag = channel.iceUfrag;
        var icePwd = channel.icePwd;
        var fingerprint = channel.fingerprint;
        var port = channel.port;

        // We'll use the "channel" object as a prototype for each new "mLine"
        // that we create, but first we need to clean it up a bit.
        delete channel.sources;
        delete channel.candidates;
        delete channel.iceUfrag;
        delete channel.icePwd;
        delete channel.fingerprint;
        delete channel.port;
        delete channel.mid;

        if (typeof sources === 'object') {

            // Explode the Plan B channel sources with one m-line per source.
            Object.keys(sources).forEach(function(ssrc) {

                // Use the "channel" as a prototype for the "mLine".
                var mLine = Object.create(channel);

                // Assign the msid of the source to the m-line.
                mLine.msid = sources[ssrc].msid;
                delete sources[ssrc].msid;

                // We assign one SSRC per media line.
                mLine.sources = {};
                mLine.sources[ssrc] = sources[ssrc];

                // Use the cached Plan A SDP (if it exists) to assign SSRCs to
                // mids.
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

                    // If this is an SSRC that we see for the first time assign
                    // it a new mid. This is typically the case when this
                    // method is called to transform a remote description for
                    // the first time or when there is a new SSRC in the remote
                    // description because a new peer has joined the
                    // conference. Local SSRCs should have already been added
                    // to the map in the toPlanB method.
                    //
                    // Because FF generates answers in Plan A style, we MUST
                    // already have a cached answer with all the local SSRCs
                    // mapped to some mLine/mid.

                    if (desc.type === 'answer') {
                        throw new Error("An unmapped SSRC was found.");
                    }

                    mLine.mid = [channel.type, '-', ssrc].join('');
                }

                // Include the candidates in the 1st media line.
                // if (Object.keys(media).length === 0) {
                mLine.candidates = candidates;
                mLine.iceUfrag = iceUfrag;
                mLine.icePwd = icePwd;
                mLine.fingerprint = fingerprint;
                mLine.port = port;
                // } else {
                //	mLine.bundleOnly = 'bundle-only';

                // In Jitsi Meet we only transform offers from Plan A to
                // Plan B. We need to make sure that bundle-only m-lines
                // have port 0.
                //	mLine.port = 0;
                //}

                media[mLine.mid] = mLine;
            });
        }
        // TODO(gp) add support for ssrc-groups
    });

    // Rebuild the media array in the right order and add the missing mLines
    // (missing from the Plan B SDP).
    session.media = [];
    mids = []; // reuse

    if (desc.type === 'answer') {

        // Add all the missing m-lines that in the cached offer but are missing
        // from the converted answer.

        if (typeof cache['offer'] === 'undefined') {
            throw new Error("An answer is being processed but we couldn't " +
                    "find a cached offer.");
        }

        var cachedOffer = transform.parse(cache['offer']);

        if (typeof cachedOffer === 'undefined' ||
            typeof cachedOffer.media === 'undefined' ||
            !Array.isArray(cachedOffer.media)) {
                // FIXME(gp) this isn't necessarily a problem.
                throw new Error("The cached offer has no media.");
        }

        cachedOffer.media.forEach(function(m) {

            var mLine;
            if (typeof media[m.mid] === 'undefined') {
                // This is probably an m-line containing a remote track only.
                // It must exist in the cached answer as a remote track only
                // mLine. TODO throw an error otherwise.

                cached.media.every(function(ma) {
                    if (m.mid == ma.mid) {
                        mLine = ma;
                        return false;
                    } else {
                        return true;
                    }
                });
            } else {
                mLine = media[m.mid];
            }

            session.media.push(mLine);
            mids.push(mLine.mid);
        });
    } else {

        // Add all the m-lines that are in both the cached and the transformed
        // SDP in the order of the cached SDP. We take the intersection because
        // don't want to add m-lines from the cached SDP that have been removed
        // from the transformed SDP.
        if (typeof cached !== 'undefined' &&
                typeof cached.media !== 'undefined' &&
            Array.isArray(cached.media)) {
            cached.media.forEach(function(pm) {
                if (typeof media[pm.mid] !== 'undefined') {
                    mids.push(pm.mid);
                    session.media.push(media[pm.mid]);
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
    session.groups.every(function(group) {
        if (group.type === 'BUNDLE') {
            group.mids = mids.join(' ');
            return false;
        } else {
            return true;
        }
    });

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    // Cache the transformed SDP (Plan A) for later re-use in this function.
    cache[desc.type] = resStr;

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};
