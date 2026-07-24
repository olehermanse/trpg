export class Keyboard {
  state: Set<string> = new Set();
  press(key: string) {
    this.state.add(key);
  }
  release(key: string) {
    this.state.delete(key);
  }
  pressed(key: string): boolean {
    return this.state.has(key);
  }
}
