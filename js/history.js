// Undo/redo via canvas JSON snapshots. Max 50 states.
const History = (() => {
  const MAX = 50;
  let stack = [];
  let index = -1;
  let canvas = null;
  let suspended = false;

  function snapshot() {
    if (!canvas || suspended) return;
    const json = JSON.stringify(canvas.toJSON());
    if (stack[index] === json) return;
    stack = stack.slice(0, index + 1);
    stack.push(json);
    if (stack.length > MAX) stack.shift();
    else index++;
  }

  function restore(json) {
    suspended = true;
    canvas.loadFromJSON(json, () => {
      canvas.renderAll();
      suspended = false;
    });
  }

  return {
    init(c) {
      canvas = c;
      stack = [];
      index = -1;
      snapshot();
      c.on('object:added', snapshot);
      c.on('object:modified', snapshot);
      c.on('object:removed', snapshot);
    },
    undo() {
      if (index <= 0) return;
      index--;
      restore(stack[index]);
    },
    redo() {
      if (index >= stack.length - 1) return;
      index++;
      restore(stack[index]);
    },
    reset() {
      stack = [];
      index = -1;
      snapshot();
    },
    suspend() { suspended = true; },
    resume() { suspended = false; snapshot(); }
  };
})();
