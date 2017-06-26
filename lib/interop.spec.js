var Interop = require("./interop.js");
var SampleSdps = require("sdp-samples");
var transform = require("sdp-transform");

/**
 * Helper function which returns an array of sdp lines that start with
 * the given string
 * @param String sdpStr the sdp string
 * @param String linePrefix the prefix for lines the caller is interested
 *  in
 * @return [] an array of sdp line strings that start with linePrefix
 */
var getLines = function(sdpStr, linePrefix) {
    var startIndex = 0,
        index = 0,
        startIndices = [],
        lines = [];
    while ((index = sdpStr.indexOf(linePrefix, startIndex)) > -1) {
        startIndices.push(index);
        startIndex = index + 1;
    }
    startIndices.forEach(function(startIndex) {
        var eolIndex = sdpStr.indexOf("\r\n", startIndex);
        lines.push(sdpStr.substring(startIndex, eolIndex));
    });
    return lines;
};

describe("sdp-interop", function() {
    var interop = null;
  beforeEach(function() {
    interop = new Interop();
  });
  describe("toPlanB", function() {
      it ("should translate simulcast correctly", function() {
          // The unified plan ssrcs should be translated into an
          // a=ssrc-group:SIM line with the 3 media ssrcs
          var unifiedSdp = SampleSdps.unifiedPlanSimulcastSdp;
          var desc = {
              type: "answer",
              sdp: unifiedSdp
          };
          var result = interop.toPlanB(desc);
          // Make sure teh a=ssrc-group line exists, then parse it
          // to make sure it contains 3 ssrcs
          var groupLines = getLines(result.sdp, "a=ssrc-group");
          expect(groupLines.length).toEqual(1);
          var groupLine = groupLines[0];
          var ssrcsStr = groupLine.split("a=ssrc-group:SIM")[1].trim();
          var ssrcs = ssrcsStr.split(" ");
          expect(ssrcs.length).toEqual(3);
          ssrcs.forEach(function(ssrc) {
              // Check that the ssrcs are the ones we 
              // expected from SampleSdps.unifiedPlanSimulcastSdp
              expect(["1359670181", "1571309374", "2006842176"])
                .toContain(ssrc);
          });
      });
  });
});
