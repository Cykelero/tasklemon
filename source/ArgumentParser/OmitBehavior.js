/* Specifies what to do when an argument is omitted by the user.  */

module.exports = class OmitBehavior {
  constructor(type, args = []) {
    this.type = type; // 'none' or 'required'
    this.args = args;
  }
};
