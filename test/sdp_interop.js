var Interop = require('../').Interop;
var fs = require('fs');

if (typeof QUnit == 'undefined') {
  QUnit = require('qunit-cli');
  QUnit.load();

  interop = require('..');
};

global.RTCSessionDescription = function (desc) {
  this.type = desc.type;
  this.sdp = desc.sdp;
}

global.RTCIceCandidate = function (cand) {
  this.candidate = cand.candidate;
  this.sdpMLineIndex = cand.sdpMLineIndex;
  this.sdpMid = cand.sdpMid;
}

var dumpSDP = function (description) {
  if (typeof description === 'undefined' || description === null) {
    return '';
  }
  return 'type: ' + description.type + '\r\n' + description.sdp;
};

QUnit.test('ChromePlanB2UnifiedPlan_1track', function (assert) {
  /*jshint multistr: true */
  var originPlanB =
    "v=0\r\n\
o=- 6352417452822806569 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=group:BUNDLE audio video\r\n\
a=msid-semantic: WMS nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=setup:actpass\r\n\
a=mid:audio\r\n\
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=sendrecv\r\n\
a=rtcp-mux\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtpmap:103 ISAC/16000\r\n\
a=rtpmap:104 ISAC/32000\r\n\
a=rtpmap:9 G722/8000\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=rtpmap:8 PCMA/8000\r\n\
a=rtpmap:106 CN/32000\r\n\
a=rtpmap:105 CN/16000\r\n\
a=rtpmap:13 CN/8000\r\n\
a=rtpmap:126 telephone-event/8000\r\n\
a=maxptime:60\r\n\
a=ssrc:3393882360 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:3393882360 msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=ssrc:3393882360 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:3393882360 label:22345512-82de-4e55-b205-967e0249e8e0\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100 116 117 96\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=setup:actpass\r\n\
a=mid:video\r\n\
a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=extmap:4 urn:3gpp:video-orientation\r\n\
a=sendrecv\r\n\
a=rtcp-mux\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=rtpmap:116 red/90000\r\n\
a=rtpmap:117 ulpfec/90000\r\n\
a=rtpmap:96 rtx/90000\r\n\
a=fmtp:96 apt=100\r\n\
a=ssrc-group:FID 2560713622 1733429841\r\n\
a=ssrc:2560713622 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:2560713622 msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:2560713622 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:2560713622 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:1733429841 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:1733429841 msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:1733429841 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:1733429841 label:9203939c-25cf-4d60-82c2-d25b19350926"

  /*jshint multistr: true */
  var expectedUnifiedPlan =
    "v=0\r\n\
o=- 6352417452822806569 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE audio-3393882360 video-1733429841\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=rtpmap:103 ISAC/16000\r\n\
a=rtpmap:104 ISAC/32000\r\n\
a=rtpmap:9 G722/8000\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=rtpmap:8 PCMA/8000\r\n\
a=rtpmap:106 CN/32000\r\n\
a=rtpmap:105 CN/16000\r\n\
a=rtpmap:13 CN/8000\r\n\
a=rtpmap:126 telephone-event/8000\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=setup:actpass\r\n\
a=mid:audio-3393882360\r\n\
a=msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=maxptime:60\r\n\
a=sendrecv\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:3393882360 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:3393882360 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:3393882360 label:22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=rtcp-mux\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100 116 117 96\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtpmap:116 red/90000\r\n\
a=rtpmap:117 ulpfec/90000\r\n\
a=rtpmap:96 rtx/90000\r\n\
a=fmtp:96 apt=100\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=extmap:4 urn:3gpp:video-orientation\r\n\
a=setup:actpass\r\n\
a=mid:video-1733429841\r\n\
a=msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=sendrecv\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:1733429841 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:1733429841 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:1733429841 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:2560713622 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:2560713622 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:2560713622 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc-group:FID 2560713622 1733429841\r\n\
a=rtcp-mux\r\n"

  var interop = new Interop();

  var offer = new RTCSessionDescription({
    type: 'offer',
    sdp: originPlanB
  });

  var unifiedPlanDesc = interop.toUnifiedPlan(offer);
  assert.equal(unifiedPlanDesc.sdp, expectedUnifiedPlan,
    "Not expected Unified Plan output")
});

QUnit.test('ChromePlanB2UnifiedPlan_2tracks', function (assert) {
  /*jshint multistr: true */
  var originPlanB =
    "v=0\r\n\
o=- 6352417452822806569 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=group:BUNDLE audio video\r\n\
a=msid-semantic: WMS 0ec45b31-e98d-49fa-b695-7631e004843a nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=setup:actpass\r\n\
a=mid:audio\r\n\
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=sendrecv\r\n\
a=rtcp-mux\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtpmap:103 ISAC/16000\r\n\
a=rtpmap:104 ISAC/32000\r\n\
a=rtpmap:9 G722/8000\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=rtpmap:8 PCMA/8000\r\n\
a=rtpmap:106 CN/32000\r\n\
a=rtpmap:105 CN/16000\r\n\
a=rtpmap:13 CN/8000\r\n\
a=rtpmap:126 telephone-event/8000\r\n\
a=maxptime:60\r\n\
a=ssrc:3393882360 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:3393882360 msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=ssrc:3393882360 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:3393882360 label:22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=ssrc:2998362345 cname:XvUdN+mQ3KWuNJNu\r\n\
a=ssrc:2998362345 msid:0ec45b31-e98d-49fa-b695-7631e004843a 96a45cea-7b24-401f-b12b-92bead3bf181\r\n\
a=ssrc:2998362345 mslabel:0ec45b31-e98d-49fa-b695-7631e004843a\r\n\
a=ssrc:2998362345 label:96a45cea-7b24-401f-b12b-92bead3bf181\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100 116 117 96\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=setup:actpass\r\n\
a=mid:video\r\n\
a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=extmap:4 urn:3gpp:video-orientation\r\n\
a=sendrecv\r\n\
a=rtcp-mux\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=rtpmap:116 red/90000\r\n\
a=rtpmap:117 ulpfec/90000\r\n\
a=rtpmap:96 rtx/90000\r\n\
a=fmtp:96 apt=100\r\n\
a=ssrc-group:FID 2560713622 1733429841\r\n\
a=ssrc:2560713622 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:2560713622 msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:2560713622 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:2560713622 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:1733429841 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:1733429841 msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:1733429841 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:1733429841 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc-group:FID 3792658351 624578865\r\n\
a=ssrc:3792658351 cname:XvUdN+mQ3KWuNJNu\r\n\
a=ssrc:3792658351 msid:0ec45b31-e98d-49fa-b695-7631e004843a 6f961540-d5ee-46da-a5b7-b42b97211905\r\n\
a=ssrc:3792658351 mslabel:0ec45b31-e98d-49fa-b695-7631e004843a\r\n\
a=ssrc:3792658351 label:6f961540-d5ee-46da-a5b7-b42b97211905\r\n\
a=ssrc:624578865 cname:XvUdN+mQ3KWuNJNu\r\n\
a=ssrc:624578865 msid:0ec45b31-e98d-49fa-b695-7631e004843a 6f961540-d5ee-46da-a5b7-b42b97211905\r\n\
a=ssrc:624578865 mslabel:0ec45b31-e98d-49fa-b695-7631e004843a\r\n\
a=ssrc:624578865 label:6f961540-d5ee-46da-a5b7-b42b97211905"

  /*jshint multistr: true */
  var expectedUnifiedPlan =
    "v=0\r\n\
o=- 6352417452822806569 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE audio-2998362345 audio-3393882360 video-624578865 video-1733429841\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=rtpmap:103 ISAC/16000\r\n\
a=rtpmap:104 ISAC/32000\r\n\
a=rtpmap:9 G722/8000\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=rtpmap:8 PCMA/8000\r\n\
a=rtpmap:106 CN/32000\r\n\
a=rtpmap:105 CN/16000\r\n\
a=rtpmap:13 CN/8000\r\n\
a=rtpmap:126 telephone-event/8000\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=setup:actpass\r\n\
a=mid:audio-2998362345\r\n\
a=msid:0ec45b31-e98d-49fa-b695-7631e004843a 96a45cea-7b24-401f-b12b-92bead3bf181\r\n\
a=maxptime:60\r\n\
a=sendrecv\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:2998362345 cname:XvUdN+mQ3KWuNJNu\r\n\
a=ssrc:2998362345 mslabel:0ec45b31-e98d-49fa-b695-7631e004843a\r\n\
a=ssrc:2998362345 label:96a45cea-7b24-401f-b12b-92bead3bf181\r\n\
a=rtcp-mux\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=rtpmap:103 ISAC/16000\r\n\
a=rtpmap:104 ISAC/32000\r\n\
a=rtpmap:9 G722/8000\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=rtpmap:8 PCMA/8000\r\n\
a=rtpmap:106 CN/32000\r\n\
a=rtpmap:105 CN/16000\r\n\
a=rtpmap:13 CN/8000\r\n\
a=rtpmap:126 telephone-event/8000\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=setup:actpass\r\n\
a=mid:audio-3393882360\r\n\
a=msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=maxptime:60\r\n\
a=sendrecv\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:3393882360 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:3393882360 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:3393882360 label:22345512-82de-4e55-b205-967e0249e8e0\r\n\
a=rtcp-mux\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100 116 117 96\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtpmap:116 red/90000\r\n\
a=rtpmap:117 ulpfec/90000\r\n\
a=rtpmap:96 rtx/90000\r\n\
a=fmtp:96 apt=100\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=extmap:4 urn:3gpp:video-orientation\r\n\
a=setup:actpass\r\n\
a=mid:video-624578865\r\n\
a=msid:0ec45b31-e98d-49fa-b695-7631e004843a 6f961540-d5ee-46da-a5b7-b42b97211905\r\n\
a=sendrecv\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:624578865 cname:XvUdN+mQ3KWuNJNu\r\n\
a=ssrc:624578865 mslabel:0ec45b31-e98d-49fa-b695-7631e004843a\r\n\
a=ssrc:624578865 label:6f961540-d5ee-46da-a5b7-b42b97211905\r\n\
a=ssrc:3792658351 cname:XvUdN+mQ3KWuNJNu\r\n\
a=ssrc:3792658351 mslabel:0ec45b31-e98d-49fa-b695-7631e004843a\r\n\
a=ssrc:3792658351 label:6f961540-d5ee-46da-a5b7-b42b97211905\r\n\
a=ssrc-group:FID 3792658351 624578865\r\n\
a=rtcp-mux\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100 116 117 96\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtpmap:116 red/90000\r\n\
a=rtpmap:117 ulpfec/90000\r\n\
a=rtpmap:96 rtx/90000\r\n\
a=fmtp:96 apt=100\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=extmap:4 urn:3gpp:video-orientation\r\n\
a=setup:actpass\r\n\
a=mid:video-1733429841\r\n\
a=msid:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=sendrecv\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:1733429841 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:1733429841 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:1733429841 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:2560713622 cname:5YcASuDc3X86mu+d\r\n\
a=ssrc:2560713622 mslabel:nnnwYrPTpGmyoJX5GFHMVv42y1ZthbnCx26c\r\n\
a=ssrc:2560713622 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc-group:FID 2560713622 1733429841\r\n\
a=rtcp-mux\r\n"

  var interop = new Interop();

  var offer = new RTCSessionDescription({
    type: 'offer',
    sdp: originPlanB
  });

  var unifiedPlanDesc = interop.toUnifiedPlan(offer);
  assert.equal(unifiedPlanDesc.sdp, expectedUnifiedPlan,
    "Not expected Unified Plan output")

  /* #region Check Unified Plan candidates */
  var candUnifiedPlan = new RTCIceCandidate ({
    "candidate" : "candidate:11111111 1 udp 22222222 10.0.0.1 2345 typ host generation 0",
    "sdpMLineIndex" : 0,
    "sdpMid" : "audio-2998362345"
  });
  var candPlanB = interop.candidateToPlanB (candUnifiedPlan);
  assert.equal(candPlanB.candidate, candUnifiedPlan.candidate, "candidate arg not matching");
  assert.equal(candPlanB.sdpMid, "audio", "sdpMid arg not matching");
  assert.equal(candPlanB.sdpMLineIndex, 0, "sdpMLineIndex arg not matching");

  var candUnifiedPlan = new RTCIceCandidate ({
    "candidate" : "candidate:11111111 1 udp 22222222 10.0.0.1 2345 typ host generation 0",
    "sdpMLineIndex" : 1,
    "sdpMid" : "audio-3393882360"
  });
  var candPlanB = interop.candidateToPlanB (candUnifiedPlan);
  assert.equal(candPlanB.candidate, candUnifiedPlan.candidate, "candidate arg not matching");
  assert.equal(candPlanB.sdpMid, "audio", "sdpMid arg not matching");
  assert.equal(candPlanB.sdpMLineIndex, 0, "sdpMLineIndex arg not matching");

  var candUnifiedPlan = new RTCIceCandidate ({
    "candidate" : "candidate:11111111 1 udp 22222222 10.0.0.1 2345 typ host generation 0",
    "sdpMLineIndex" : 2,
    "sdpMid" : "video-624578865"
  });
  var candPlanB = interop.candidateToPlanB (candUnifiedPlan);
  assert.equal(candPlanB.candidate, candUnifiedPlan.candidate, "candidate arg not matching");
  assert.equal(candPlanB.sdpMid, "video", "sdpMid arg not matching");
  assert.equal(candPlanB.sdpMLineIndex, 1, "sdpMLineIndex arg not matching");

  var candUnifiedPlan = new RTCIceCandidate ({
    "candidate" : "candidate:11111111 1 udp 22222222 10.0.0.1 2345 typ host generation 0",
    "sdpMLineIndex" : 3,
    "sdpMid" : "video-1733429841"
  });
  var candPlanB = interop.candidateToPlanB (candUnifiedPlan);
  assert.equal(candPlanB.candidate, candUnifiedPlan.candidate, "candidate arg not matching");
  assert.equal(candPlanB.sdpMid, "video", "sdpMid arg not matching");
  assert.equal(candPlanB.sdpMLineIndex, 1, "sdpMLineIndex arg not matching");
  /* #endregion */

  /* #region Check Plan B candidates */
  var candPlanB = new RTCIceCandidate ({
    "candidate" : "candidate:11111111 1 udp 22222222 10.0.0.1 2345 typ host generation 0",
    "sdpMLineIndex" : 0,
    "sdpMid" : "audio"
  });
  var candUnifiedPlan = interop.candidateToUnifiedPlan (candPlanB);
  assert.equal(candUnifiedPlan.candidate, candPlanB.candidate, "candidate arg not matching");
  assert.equal(candUnifiedPlan.sdpMid, "audio", "sdpMid arg not matching");
  assert.equal(candUnifiedPlan.sdpMLineIndex, 0, "sdpMLineIndex arg not matching");

  var candPlanB = new RTCIceCandidate ({
    "candidate" : "candidate:11111111 1 udp 22222222 10.0.0.1 2345 typ host generation 0",
    "sdpMLineIndex" : 1,
    "sdpMid" : "video"
  });
  var candUnifiedPlan = interop.candidateToUnifiedPlan (candPlanB);
  assert.equal(candUnifiedPlan.candidate, candPlanB.candidate, "candidate arg not matching");
  assert.equal(candUnifiedPlan.sdpMid, "video", "sdpMid arg not matching");
  assert.equal(candUnifiedPlan.sdpMLineIndex, 2, "sdpMLineIndex arg not matching");
  /* #endregion */
});

QUnit.test('sendonlyPlanB2UnifiedPlan', function (assert) {
  /*jshint multistr: true */
  var originPlanB =
    "v=0\r\n\
o=- 6352417452822806569 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=group:BUNDLE audio video\r\n\
a=msid-semantic: WMS MS-0\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=setup:actpass\r\n\
a=mid:audio\r\n\
a=sendonly\r\n\
a=rtcp-mux\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=ssrc:1001 cname:CN-0\r\n\
a=ssrc:1001 msid:MS-0 MST-0_0\r\n\
a=ssrc:1001 mslabel:MS-0\r\n\
a=ssrc:1001 label:MST-0_0\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=setup:actpass\r\n\
a=mid:video\r\n\
a=sendonly\r\n\
a=rtcp-mux\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=ssrc-group:FID 2001\r\n\
a=ssrc:2001 cname:CN-0\r\n\
a=ssrc:2001 msid:MS-0 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=ssrc:2001 mslabel:MS-0\r\n\
a=ssrc:2001 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n"

  /*jshint multistr: true */
  var expectedUnifiedPlan =
    "v=0\r\n\
o=- 6352417452822806569 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE audio-1001 video-2001\r\n\
m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=setup:actpass\r\n\
a=mid:audio-1001\r\n\
a=msid:MS-0 MST-0_0\r\n\
a=sendonly\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:1001 cname:CN-0\r\n\
a=ssrc:1001 mslabel:MS-0\r\n\
a=ssrc:1001 label:MST-0_0\r\n\
a=rtcp-mux\r\n\
m=video 9 UDP/TLS/RTP/SAVPF 100\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=setup:actpass\r\n\
a=mid:video-2001\r\n\
a=msid:MS-0 9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=sendonly\r\n\
a=ice-ufrag:xHOGnBsKDPCmHB5t\r\n\
a=ice-pwd:qpnbhhoyeTrypBkX5F1u338T\r\n\
a=fingerprint:sha-256 58:E0:FE:56:6A:8C:5A:AD:71:5B:A0:52:47:27:60:66:27:53:EC:B6:F3:03:A8:4B:9B:30:28:62:29:49:C6:73\r\n\
a=ssrc:2001 cname:CN-0\r\n\
a=ssrc:2001 mslabel:MS-0\r\n\
a=ssrc:2001 label:9203939c-25cf-4d60-82c2-d25b19350926\r\n\
a=rtcp-mux\r\n"

  var interop = new Interop();

  var offer = new RTCSessionDescription({
    type: 'offer',
    sdp: originPlanB
  });

  var unifiedPlanDesc = interop.toUnifiedPlan(offer);
  assert.equal(unifiedPlanDesc.sdp, expectedUnifiedPlan,
    "Not expected Unified Plan output")
});

QUnit.test('audioInactiveUnifiedPlan2PlanB', function (assert) {
  /*jshint multistr: true */
  var originUnifiedPlan =
    "v=0\r\n\
o=- 3656853607 3656853607 IN IP4 0.0.0.0\r\n\
s=Kurento Media Server\r\n\
c=IN IP4 0.0.0.0\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE video-65477720 video-774581929\r\n\
m=audio 0 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
a=inactive\r\n\
a=mid:audio-2331169307\r\n\
m=audio 0 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
a=inactive\r\n\
a=mid:audio-3362868299\r\n\
m=video 1 UDP/TLS/RTP/SAVPF 100\r\n\
b=AS:2000\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=setup:active\r\n\
a=mid:video-65477720\r\n\
a=recvonly\r\n\
a=rtcp-mux\r\n\
a=ssrc:3850339357 cname:user1483941637@host-3c4150dc\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:F3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n\
m=video 1 UDP/TLS/RTP/SAVPF 100\r\n\
b=AS:2000\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=setup:active\r\n\
a=mid:video-774581929\r\n\
a=recvonly\r\n\
a=rtcp-mux\r\n\
a=ssrc:3423627266 cname:user1483941637@host-3c4150dc\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:FR3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n"

  /*jshint multistr: true */
  var expectedPlanB =
    "v=0\r\n\
o=- 3656853607 3656853607 IN IP4 0.0.0.0\r\n\
s=Kurento Media Server\r\n\
c=IN IP4 0.0.0.0\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE video\r\n\
m=audio 0 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
a=mid:audio\r\n\
a=inactive\r\n\
m=video 1 UDP/TLS/RTP/SAVPF 100\r\n\
b=AS:2000\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=setup:active\r\n\
a=mid:video\r\n\
a=recvonly\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:F3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n\
a=ssrc:3423627266 cname:user1483941637@host-3c4150dc\r\n\
a=ssrc:3850339357 cname:user1483941637@host-3c4150dc\r\n\
a=rtcp-mux\r\n"

  var interop = new Interop();

  var answer = new RTCSessionDescription({
    type: 'answer',
    sdp: originUnifiedPlan
  });

  var planBDesc = interop.toPlanB(answer);
  assert.equal(planBDesc.sdp, expectedPlanB,
    "Not expected Plan B output")
});

QUnit.test('1audio1videoInactivesUnifiedPlan2PlanB', function (assert) {
  /*jshint multistr: true */
  var originUnifiedPlan =
    "v=0\r\n\
o=- 3656853607 3656853607 IN IP4 0.0.0.0\r\n\
s=Kurento Media Server\r\n\
c=IN IP4 0.0.0.0\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE audio-3362868299 video-774581929\r\n\
m=audio 0 UDP/TLS/RTP/SAVPF 111 0\r\n\
a=inactive\r\n\
a=mid:audio-2331169307\r\n\
m=audio 1 UDP/TLS/RTP/SAVPF 111 0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=setup:active\r\n\
a=mid:audio-3362868299\r\n\
a=recvonly\r\n\
a=rtcp-mux\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=maxptime:60\r\n\
a=ssrc:4147269654 cname:user1483941637@host-3c4150dc\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:F3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n\
m=video 1 UDP/TLS/RTP/SAVPF 100 116 117 96\r\n\
a=inactive\r\n\
a=mid:video-65477720\r\n\
m=video 1 UDP/TLS/RTP/SAVPF 100\r\n\
b=AS:2000\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=setup:active\r\n\
a=mid:video-774581929\r\n\
a=recvonly\r\n\
a=rtcp-mux\r\n\
a=ssrc:3423627266 cname:user1483941637@host-3c4150dc\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:F3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n"

  /*jshint multistr: true */
  var expectedPlanB =
   "v=0\r\n\
o=- 3656853607 3656853607 IN IP4 0.0.0.0\r\n\
s=Kurento Media Server\r\n\
c=IN IP4 0.0.0.0\r\n\
t=0 0\r\n\
a=msid-semantic: WMS *\r\n\
a=group:BUNDLE audio video\r\n\
m=audio 1 UDP/TLS/RTP/SAVPF 111 0\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=setup:active\r\n\
a=mid:audio\r\n\
a=maxptime:60\r\n\
a=recvonly\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:F3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n\
a=ssrc:4147269654 cname:user1483941637@host-3c4150dc\r\n\
a=rtcp-mux\r\n\
m=video 1 UDP/TLS/RTP/SAVPF 100\r\n\
b=AS:2000\r\n\
a=rtpmap:100 VP8/90000\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=rtcp-fb:100 ccm fir\r\n\
a=rtcp-fb:100 nack\r\n\
a=rtcp-fb:100 nack pli\r\n\
a=rtcp-fb:100 goog-remb\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=setup:active\r\n\
a=mid:video\r\n\
a=recvonly\r\n\
a=ice-ufrag:l+rG\r\n\
a=ice-pwd:Ab5LzP5Wn5dBfC6ct6Xhg3\r\n\
a=fingerprint:sha-256 E7:70:CE:58:6A:CC:77:B0:B4:4B:F2:BC:7E:89:0D:69:E3:90:F3:7A:11:78:B1:5A:CD:E6:41:19:14:EB:56:49\r\n\
a=ssrc:3423627266 cname:user1483941637@host-3c4150dc\r\n\
a=rtcp-mux\r\n"

  var interop = new Interop();

  var answer = new RTCSessionDescription({
    type: 'answer',
    sdp: originUnifiedPlan
  });

  var planBDesc = interop.toPlanB(answer);
  assert.equal(planBDesc.sdp, expectedPlanB,
    "Not expected Plan B output")
});

QUnit.test('3-way-jitsi', function (assert) {

  var interop = new Interop();

  var playbook = JSON.parse(fs.readFileSync("test/3-way-jitsi/playbook.json"));

  for (var k = 0; k < playbook.length; k++) {
    var point = playbook[k];

    for (var i = 1; i < point.transformations.length; i++) {
      var transformation = point.transformations[i];
      var expected = transformation.sessionDescription;
      if (expected == null) {
        continue;
      }

      var input = point.transformations[i - 1].sessionDescription;
      if (input == null) {
        continue;
      }

      if (transformation.name == "interop.toUnifiedPlan") {
        var output = interop.toUnifiedPlan(input);
        assert.equal(expected.sdp, output.sdp, k + "th " + point.name + " failed at " + i + "th transformation.");


      } else if (transformation.name == "interop.toPlanB") {
        var output = interop.toPlanB(input);
        assert.equal(expected.sdp, output.sdp, k + "th " + point.name + " failed at " + i + "th transformation.");
      }
    }
  }
});

QUnit.test('2-way-jitsi', function (assert) {

  var interop = new Interop();

  var playbook = JSON.parse(fs.readFileSync("test/2-way-jitsi/playbook.json"));

  for (var k = 0; k < playbook.length; k++) {
    var point = playbook[k];

    for (var i = 1; i < point.transformations.length; i++) {
      var transformation = point.transformations[i];
      var expected = transformation.sessionDescription;
      if (expected == null)
      {
        continue;
      }

      var input = point.transformations[i-1].sessionDescription;
      if (input == null)
      {
        continue;
      }

      if (transformation.name == "interop.toUnifiedPlan") {
        var output = interop.toUnifiedPlan(input);
        assert.equal(expected.sdp, output.sdp, k + "th " + point.name + " failed at " + i + "th transformation.");

      } else if (transformation.name == "interop.toPlanB") {
        var output = interop.toPlanB(input);
        assert.equal(expected.sdp, output.sdp, k + "th " + point.name + " failed at " + i + "th transformation.");
      }
    };
  };
});
