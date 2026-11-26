// 變形棋 engine — compact, legal-move chess with a small alpha-beta AI.
// Board: 64-element array, index = rank*8 + file, rank 0 = white's back rank.
// Pieces: 'P','N','B','R','Q','K' (white) / lowercase (black) / null.

export const FILES = 'abcdefgh';
export const isWhite = p => p && p === p.toUpperCase();
export const colorOf = p => (p ? (isWhite(p) ? 'w' : 'b') : null);
export const sq = (f, r) => r * 8 + f;
export const fileOf = s => s & 7;
export const rankOf = s => s >> 3;
export const sqName = s => FILES[fileOf(s)] + (rankOf(s) + 1);

export function initialState() {
  const b = new Array(64).fill(null);
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let f = 0; f < 8; f++) {
    b[sq(f, 0)] = back[f];
    b[sq(f, 1)] = 'P';
    b[sq(f, 6)] = 'p';
    b[sq(f, 7)] = back[f].toLowerCase();
  }
  return { board: b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, history: [] };
}

const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function onBoard(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }

export function attacked(board, s, byColor) {
  const f = fileOf(s), r = rankOf(s);
  const own = p => p && colorOf(p) === byColor;
  // pawns
  const dir = byColor === 'w' ? -1 : 1;
  for (const df of [-1, 1]) {
    const ff = f + df, rr = r + dir;
    if (onBoard(ff, rr)) { const p = board[sq(ff, rr)]; if (own(p) && p.toUpperCase() === 'P') return true; }
  }
  for (const [df, dr] of KN) {
    const ff = f + df, rr = r + dr;
    if (onBoard(ff, rr)) { const p = board[sq(ff, rr)]; if (own(p) && p.toUpperCase() === 'N') return true; }
  }
  for (const [df, dr] of KG) {
    const ff = f + df, rr = r + dr;
    if (onBoard(ff, rr)) { const p = board[sq(ff, rr)]; if (own(p) && p.toUpperCase() === 'K') return true; }
  }
  const ray = (dirs, kinds) => {
    for (const [df, dr] of dirs) {
      let ff = f + df, rr = r + dr;
      while (onBoard(ff, rr)) {
        const p = board[sq(ff, rr)];
        if (p) { if (own(p) && kinds.includes(p.toUpperCase())) return true; break; }
        ff += df; rr += dr;
      }
    }
    return false;
  };
  return ray(DIAG, 'BQ') || ray(ORTH, 'RQ');
}

export function kingSquare(board, color) {
  const k = color === 'w' ? 'K' : 'k';
  return board.indexOf(k);
}

export function inCheck(state, color = state.turn) {
  const ks = kingSquare(state.board, color);
  return ks >= 0 && attacked(state.board, ks, color === 'w' ? 'b' : 'w');
}

function pseudoMoves(state) {
  const { board, turn } = state;
  const moves = [];
  const enemy = turn === 'w' ? 'b' : 'w';
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p || colorOf(p) !== turn) continue;
    const f = fileOf(s), r = rankOf(s), t = p.toUpperCase();
    const add = (to, extra = {}) => moves.push({ from: s, to, piece: p, captured: board[to], ...extra });
    if (t === 'P') {
      const dir = turn === 'w' ? 1 : -1, start = turn === 'w' ? 1 : 6, last = turn === 'w' ? 7 : 0;
      const one = sq(f, r + dir);
      const pushPromo = (to, cap) => {
        if (rankOf(to) === last) for (const pr of 'QRBN') add(to, { promo: turn === 'w' ? pr : pr.toLowerCase(), ...(cap || {}) });
        else add(to, cap || {});
      };
      if (onBoard(f, r + dir) && !board[one]) {
        pushPromo(one);
        const two = sq(f, r + 2 * dir);
        if (r === start && !board[two]) add(two, { double: true });
      }
      for (const df of [-1, 1]) {
        const ff = f + df, rr = r + dir;
        if (!onBoard(ff, rr)) continue;
        const to = sq(ff, rr);
        if (board[to] && colorOf(board[to]) === enemy) pushPromo(to);
        else if (to === state.ep) add(to, { enPassant: true, captured: turn === 'w' ? 'p' : 'P', capSq: sq(ff, r) });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [df, dr] of t === 'N' ? KN : KG) {
        const ff = f + df, rr = r + dr;
        if (!onBoard(ff, rr)) continue;
        const to = sq(ff, rr);
        if (!board[to] || colorOf(board[to]) === enemy) add(to);
      }
      if (t === 'K') {
        const home = turn === 'w' ? 0 : 7;
        const [kc, qc] = turn === 'w' ? ['K', 'Q'] : ['k', 'q'];
        if (s === sq(4, home) && !attacked(board, s, enemy)) {
          if (state.castle[kc] && !board[sq(5, home)] && !board[sq(6, home)] &&
              board[sq(7, home)] === (turn === 'w' ? 'R' : 'r') &&
              !attacked(board, sq(5, home), enemy) && !attacked(board, sq(6, home), enemy))
            add(sq(6, home), { castle: 'K', rookFrom: sq(7, home), rookTo: sq(5, home) });
          if (state.castle[qc] && !board[sq(3, home)] && !board[sq(2, home)] && !board[sq(1, home)] &&
              board[sq(0, home)] === (turn === 'w' ? 'R' : 'r') &&
              !attacked(board, sq(3, home), enemy) && !attacked(board, sq(2, home), enemy))
            add(sq(2, home), { castle: 'Q', rookFrom: sq(0, home), rookTo: sq(3, home) });
        }
      }
    } else {
      const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
      for (const [df, dr] of dirs) {
        let ff = f + df, rr = r + dr;
        while (onBoard(ff, rr)) {
          const to = sq(ff, rr);
          if (board[to]) { if (colorOf(board[to]) === enemy) add(to); break; }
          add(to);
          ff += df; rr += dr;
        }
      }
    }
  }
  return moves;
}

export function makeMove(state, m) {
  const b = state.board.slice();
  const castle = { ...state.castle };
  b[m.to] = m.promo || m.piece;
  b[m.from] = null;
  if (m.enPassant) b[m.capSq] = null;
  if (m.castle) { b[m.rookTo] = b[m.rookFrom]; b[m.rookFrom] = null; }
  const t = m.piece.toUpperCase();
  if (t === 'K') { if (state.turn === 'w') castle.K = castle.Q = false; else castle.k = castle.q = false; }
  const touch = s => {
    if (s === 0) castle.Q = false; if (s === 7) castle.K = false;
    if (s === 56) castle.q = false; if (s === 63) castle.k = false;
  };
  touch(m.from); touch(m.to);
  return {
    board: b,
    turn: state.turn === 'w' ? 'b' : 'w',
    castle,
    ep: m.double ? (m.from + m.to) / 2 : -1,
    half: m.captured || t === 'P' ? 0 : state.half + 1,
    history: state.history,
  };
}

export function legalMoves(state) {
  return pseudoMoves(state).filter(m => !inCheck(makeMove(state, m), state.turn));
}

export function status(state) {
  const moves = legalMoves(state);
  const check = inCheck(state);
  if (!moves.length) return check ? 'checkmate' : 'stalemate';
  if (state.half >= 100) return 'fifty';
  const rest = state.board.filter(p => p && p.toUpperCase() !== 'K');
  if (!rest.length || (rest.length === 1 && 'BN'.includes(rest[0].toUpperCase()))) return 'insufficient';
  return check ? 'check' : 'play';
}

export function toSAN(state, m) {
  if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O';
  const t = m.piece.toUpperCase();
  let s = '';
  if (t === 'P') { if (m.captured) s += FILES[fileOf(m.from)] + 'x'; }
  else {
    s += t;
    const others = legalMoves(state).filter(o => o.to === m.to && o.piece === m.piece && o.from !== m.from);
    if (others.length) {
      if (others.every(o => fileOf(o.from) !== fileOf(m.from))) s += FILES[fileOf(m.from)];
      else if (others.every(o => rankOf(o.from) !== rankOf(m.from))) s += rankOf(m.from) + 1;
      else s += sqName(m.from);
    }
    if (m.captured) s += 'x';
  }
  s += sqName(m.to);
  if (m.promo) s += '=' + m.promo.toUpperCase();
  const next = makeMove(state, m);
  const st = status(next);
  if (st === 'checkmate') s += '#'; else if (inCheck(next)) s += '+';
  return s;
}

// ---------- AI ----------
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
// piece-square tables from white's perspective, index rank*8+file with rank 0 = white back rank
const PST = {
  P: [0,0,0,0,0,0,0,0, 5,10,10,-20,-20,10,10,5, 5,-5,-10,0,0,-10,-5,5, 0,0,0,20,20,0,0,0, 5,5,10,25,25,10,5,5, 10,10,20,30,30,20,10,10, 50,50,50,50,50,50,50,50, 0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,5,5,0,-20,-40, -30,5,10,15,15,10,5,-30, -30,0,15,20,20,15,0,-30, -30,5,15,20,20,15,5,-30, -30,0,10,15,15,10,0,-30, -40,-20,0,0,0,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,5,0,0,0,0,5,-10, -10,10,10,10,10,10,10,-10, -10,0,10,10,10,10,0,-10, -10,5,5,10,10,5,5,-10, -10,0,5,10,10,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,5,5,0,0,0, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 5,10,10,10,10,10,10,5, 0,0,0,0,0,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,5,0,0,0,0,-10, -10,5,5,5,5,5,0,-10, 0,0,5,5,5,5,0,-5, -5,0,5,5,5,5,0,-5, -10,0,5,5,5,5,0,-10, -10,0,0,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  K: [20,30,10,0,0,10,30,20, 20,20,0,0,0,0,20,20, -10,-20,-20,-20,-20,-20,-20,-10, -20,-30,-30,-40,-40,-30,-30,-20, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30],
};

function evaluate(board) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const t = p.toUpperCase();
    if (isWhite(p)) s += VAL[t] + PST[t][i];
    else s -= VAL[t] + PST[t][(7 - rankOf(i)) * 8 + fileOf(i)];
  }
  return s;
}

function order(moves) {
  return moves.sort((a, b) =>
    ((b.captured ? 10 * VAL[b.captured.toUpperCase()] - VAL[b.piece.toUpperCase()] : 0) + (b.promo ? 800 : 0)) -
    ((a.captured ? 10 * VAL[a.captured.toUpperCase()] - VAL[a.piece.toUpperCase()] : 0) + (a.promo ? 800 : 0)));
}

function negamax(state, depth, alpha, beta, ply) {
  const moves = legalMoves(state);
  if (!moves.length) return inCheck(state) ? -100000 + ply : 0;
  if (depth === 0) return quiesce(state, alpha, beta, 4);
  for (const m of order(moves)) {
    const v = -negamax(makeMove(state, m), depth - 1, -beta, -alpha, ply + 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function quiesce(state, alpha, beta, depth) {
  const stand = (state.turn === 'w' ? 1 : -1) * evaluate(state.board);
  if (stand >= beta || depth === 0) return stand;
  if (stand > alpha) alpha = stand;
  const caps = order(pseudoMoves(state).filter(m => m.captured));
  for (const m of caps) {
    const next = makeMove(state, m);
    if (inCheck(next, state.turn)) continue;
    const v = -quiesce(next, -beta, -alpha, depth - 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

export function bestMove(state, depth = 2, slack = 5) {
  const moves = order(legalMoves(state));
  if (!moves.length) return null;
  let best = [], bestV = -Infinity;
  for (const m of moves) {
    const v = -negamax(makeMove(state, m), depth - 1, -Infinity, Infinity, 1);
    if (v > bestV) { bestV = v; best = best.filter(b => b.v >= v - slack); best.push({ m, v }); }
    else if (v >= bestV - slack) best.push({ m, v });
  }
  return best[Math.floor(Math.random() * best.length)].m;
}
