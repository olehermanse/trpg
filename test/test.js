const Session = require("../libtowers/libtowers.js").Session;

var assert = require("assert");

describe("Session", function () {
  it("Has name and content", function () {
    let session = new Session("myname", "mycontent");
    assert.strictEqual(session.name, "myname");
    assert.strictEqual(session.content, "mycontent");
  });
  describe("#from()", function () {
    it("Copies values from another session", function () {
      let foo = new Session("myname", "mycontent");
      let bar = Session.from(foo);
      assert.strictEqual(bar.name, "myname");
      assert.strictEqual(bar.content, "mycontent");
    });
  });
  describe("#from_json()", function () {
    it("Parses a JSON serialized session", function () {
      let bar = Session.from_json('{"name": "a", "content": "b", "start": "c"}');
      assert.strictEqual(bar.name, "a");
      assert.strictEqual(bar.content, "b");
      assert.strictEqual(bar.start, "c");
    });
    it("Works with to_json", function () {
      let foo = new Session("a", "b", "c");
      let bar = Session.from_json(foo.to_json());
      assert.strictEqual(bar.name, "a");
      assert.strictEqual(bar.content, "b");
      assert.strictEqual(bar.start, "c");
    });
  });
  describe("#copy()", function () {
    it("Creates a copy of the session", function () {
      let foo = new Session("myname", "mycontent");
      let bar = foo.copy();
      assert.strictEqual(bar.name, "myname");
      assert.strictEqual(bar.content, "mycontent");
    });
  });
  describe("#to_json()", function () {
    it("Serializes a session to JSON", function () {
      let foo = new Session("myname", "mycontent");
      let serialized = foo.to_json();
      let bar = JSON.parse(serialized);
      assert.strictEqual(bar.name, "myname");
      assert.strictEqual(bar.content, "mycontent");
    });
  });
  describe("#identical()", function () {
    it("Returns true when sessions are identical", function () {
      let foo = new Session("myname", "mycontent");
      let bar = foo.copy();
      assert.ok(foo.identical(bar));
    });
    it("Returns true when sessions are identical", function () {
      let foo = new Session("myname", "mycontent");
      let bar = new Session("myname", "mycontents");
      assert.ok(!foo.identical(bar));
    });
  });
});
