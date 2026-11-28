// The chess AI runs here, off the main thread, so its search never freezes the animation.
import * as E from './engine.js';
self.onmessage = e => {
  const { id, state, depth, slack } = e.data;
  let m = null;
  try { m = E.bestMove(state, depth, slack); } catch (err) { /* fall through with null */ }
  self.postMessage({ id, m });
};
