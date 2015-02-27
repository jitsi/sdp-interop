var fs = require('fs')
  , Interop = require('../').Interop;

exports.simpleCall = function (t) {
  fs.readFile(__dirname + '/1-setRemoteDescription-preTransform.sdp', function (err, sdp) {
    if (err) {
      t.ok(false, "failed to read file:" + err);
      t.done();
      return;
    }
    t.done();
  });
};

