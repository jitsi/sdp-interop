var Interop = require("./interop.js");
var SampleSdps = require("./SampleSdpStrings.js");
var transform = require("sdp-transform");

describe("sdp-interop", function() {
  beforeEach(function() {
    this.interop = new Interop();
  });
  it ("blah", function() {
    var rtxSdp = SampleSdps.rtxVideoSdp;
    var result = 
      this.interop.toUnifiedPlan({type: "offer", sdp: transform.write(rtxSdp)});
  });

});
