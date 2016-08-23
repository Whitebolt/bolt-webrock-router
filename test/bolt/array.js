const chai = require('chai');
const assert = chai.assert;
const bolt = Object.assign(
  require('lodash'),
  require(getFilePathForSubject())
);

function getFilePathForSubject() {
  return process.cwd() + __dirname.replace(new RegExp('^' + process.cwd() + '/test'), '') + '/' + __filename.split('/').pop();
}

describe('bolt.array', ()=>{
  describe('bolt.makeArray()', ()=>{
    it('Should convert non-arrays to array', ()=>{
      assert.isArray(bolt.makeArray(1));
      assert.isArray(bolt.makeArray("1"));
      assert.isArray(bolt.makeArray({}));
      assert.deepEqual(bolt.makeArray(1), [1]);
      assert.deepEqual(bolt.makeArray("1"), ["1"]);
      assert.deepEqual(bolt.makeArray({}), [{}]);
      assert.deepEqual(bolt.makeArray({1:"test"}), [{1:"test"}]);
    });

    it('Should not convert if already an array', ()=>{
      assert.deepEqual(bolt.makeArray([1]), [1]);
      assert.deepEqual(bolt.makeArray([1,2,3,4]), [1,2,3,4]);

      let testArray1 = [1,2,3,4];
      let testArray2 = bolt.makeArray(testArray1);
      testArray1[0] = 0;

      assert.deepEqual(testArray1, testArray2);
    });
  });
});