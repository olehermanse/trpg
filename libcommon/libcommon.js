class Session {
  constructor(name, content, start = new Date().toISOString()) {
    this.name = name;
    this.content = content;
    this.start = start;
  }

  static from(data) {
    return new Session(data.name, data.content, data.start);
  }

  static from_json(json_string) {
    return Session.from(JSON.parse(json_string));
  }

  copy() {
    return Session.from(this);
  }

  to_json() {
    return JSON.stringify(this);
  }

  identical(other) {
    return (
      this.name === other.name &&
      this.content === other.content &&
      this.start === other.start
    );
  }
}

module.exports = {
  Session,
};
