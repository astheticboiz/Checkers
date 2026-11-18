import React, { useState, useCallback } from 'react';

const ROWS = 8;
const COLS = 8;

const initBoard = () => {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = { color: 'black', king: false };
        if (r > 4) board[r][c] = { color: 'red', king: false };
      }
    }
  }
  return board;
};

export default function App() {
  const [board, setBoard] = useState(initBoard());
  const [turn, setTurn] = useState('red');
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [winner, setWinner] = useState(null);

  const getPieceMoves = useCallback((b, r, c) => {
    const piece = b[r][c];
    if (!piece) return [];
    const { color, king } = piece;
    const dirs = king
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : color === 'red'
        ? [
            [-1, -1],
            [-1, 1],
          ]
        : [
            [1, -1],
            [1, 1],
          ];
    const captures = [];
    const simples = [];
    for (const [dr, dc] of dirs) {
      const r1 = r + dr;
      const c1 = c + dc;
      const r2 = r + 2 * dr;
      const c2 = c + 2 * dc;
      if (r1 >= 0 && r1 < ROWS && c1 >= 0 && c1 < COLS) {
        const target = b[r1][c1];
        if (target && target.color !== color) {
          if (
            r2 >= 0 &&
            r2 < ROWS &&
            c2 >= 0 &&
            c2 < COLS &&
            !b[r2][c2]
          ) {
            captures.push({
              toRow: r2,
              toCol: c2,
              capture: true,
              captured: { row: r1, col: c1 },
            });
          }
        } else if (!target) {
          simples.push({
            toRow: r1,
            toCol: c1,
            capture: false,
            captured: null,
          });
        }
      }
    }
    return captures.length > 0 ? captures : simples;
  }, []);

  const getAllMoves = useCallback((b, color) => {
    let allCaptures = [];
    let allSimples = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = b[r][c];
        if (p && p.color === color) {
          const moves = getPieceMoves(b, r, c);
          const caps = moves.filter((m) => m.capture);
          const sims = moves.filter((m) => !m.capture);
          allCaptures.push(...caps.map((m) => ({ from: { r, c }, ...m })));
          allSimples.push(...sims.map((m) => ({ from: { r, c }, ...m })));
        }
      }
    }
    return allCaptures.length > 0 ? allCaptures : allSimples;
  }, [getPieceMoves]);

  const checkWinner = useCallback((b, nextTurn) => {
    let redCount = 0;
    let blackCount = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = b[r][c];
        if (p) {
          if (p.color === 'red') redCount++;
          else blackCount++;
        }
      }
    }
    if (redCount === 0) return 'black';
    if (blackCount === 0) return 'red';
    const opponentHasMoves = getAllMoves(b, nextTurn).length > 0;
    if (!opponentHasMoves) return nextTurn === 'red' ? 'black' : 'red';
    return null;
  }, [getAllMoves]);

  const selectPiece = useCallback((r, c) => {
    const piece = board[r][c];
    if (!piece || piece.color !== turn) return;
    const allMoves = getAllMoves(board, turn);
    const globalCapture = allMoves.some((m) => m.capture);
    const pieceMoves = getPieceMoves(board, r, c);
    const filtered = globalCapture
      ? pieceMoves.filter((m) => m.capture)
      : pieceMoves;
    if (filtered.length === 0) return;
    setSelected({ r, c });
    setValidMoves(filtered);
  }, [board, turn, getAllMoves, getPieceMoves]);

  const handleSquareClick = (r, c) => {
    if (winner) return;
    if (selected) {
      const move = validMoves.find((m) => m.toRow === r && m.toCol === c);
      if (move) {
        executeMove(selected, move);
      } else {
        selectPiece(r, c);
      }
    } else {
      selectPiece(r, c);
    }
  };

  const executeMove = (from, move) => {
    const newBoard = board.map((row) => [...row]);
    const piece = newBoard[from.r][from.c];
    newBoard[from.r][from.c] = null;
    const movedPiece = { ...piece };
    if (move.capture) {
      newBoard[move.captured.row][move.captured.col] = null;
    }
    const promotionRow = movedPiece.color === 'red' ? 0 : ROWS - 1;
    if (move.toRow === promotionRow) movedPiece.king = true;
    newBoard[move.toRow][move.toCol] = movedPiece;
    setBoard(newBoard);

    if (move.capture) {
      const again = getPieceMoves(newBoard, move.toRow, move.toCol).filter(
        (m) => m.capture
      );
      if (again.length > 0) {
        setSelected({ r: move.toRow, c: move.toCol });
        setValidMoves(again);
        return;
      }
    }

    const nextTurn = turn === 'red' ? 'black' : 'red';
    const win = checkWinner(newBoard, nextTurn);
    if (win) {
      setWinner(win);
      setSelected(null);
      setValidMoves([]);
    } else {
      setTurn(nextTurn);
      setSelected(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    setBoard(initBoard());
    setTurn('red');
    setSelected(null);
    setValidMoves([]);
    setWinner(null);
  };

  return (
    <div className='min-h-screen bg-[#fafafa] text-zinc-900 p-4 md:p-8 flex flex-col items-center'>
      <div className='w-full max-w-3xl'>
        <header className='flex flex-col md:flex-row items-center justify-between gap-6 mb-10'>
          <div>
            <h1 className='text-5xl font-black tracking-tighter text-zinc-900'>
              Checkers
            </h1>
            <p className='text-zinc-500 text-sm mt-1'>
              Premium strategy board game
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <div className='flex flex-col items-center'>
              <span className='text-xs font-semibold uppercase tracking-widest text-zinc-400'>
                Current Turn
              </span>
              <div className='flex items-center gap-3 mt-1'>
                <div
                  className={`w-3 h-3 rounded-full transition-all ${turn === 'red'
                    ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : 'bg-zinc-900'}`}
                ></div>
                <span
                  className={`font-semibold ${turn === 'red' ? 'text-red-600' : 'text-zinc-800'}`}
                >
                  {turn === 'red' ? 'Red' : 'Black'}
                </span>
              </div>
            </div>
            <button
              onClick={resetGame}
              className='px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-all active:scale-95 shadow-sm'
            >
              Reset Game
            </button>
          </div>
        </header>

        <div className='flex flex-col items-center justify-center relative'>
          {winner && (
            <div className='absolute inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-20 p-4'>
              <div className='bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full border border-zinc-100'>
                <div className='w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl'>
                  <i className='fa-solid fa-star text-2xl'></i>
                </div>
                <h2 className='text-3xl font-bold text-zinc-900 mb-2'>
                  {winner.charAt(0).toUpperCase() + winner.slice(1)} Wins!
                </h2>
                <p className='text-zinc-500 mb-6'>
                  Excellent play. Ready for another round?
                </p>
                <button
                  onClick={resetGame}
                  className='w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg'
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          <div
            className='relative aspect-[1/1] w-full max-w-md mx-auto rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden bg-white'
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected =
                  selected && selected.r === r && selected.c === c;
                const isValidTarget =
                  validMoves.some((m) => m.toRow === r && m.toCol === c) &&
                  !cell;
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    style={
                      {
                        top: `${r * 12.5}%`,
                        left: `${c * 12.5}%`,
                      }
                    }
                    className={`absolute w-[12.5%] h-[12.5%] transition-all duration-300 ease-out ${isDark ? 'bg-zinc-600' : 'bg-zinc-100'} ${isSelected ? 'ring-4 ring-indigo-500/60' : ''} ${isValidTarget ? 'bg-zinc-300' : ''}`}
                  >
                    {isValidTarget && (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='w-3 h-3 rounded-full bg-zinc-700/60'></div>
                      </div>
                    )}
                    {cell && (
                      <div
                        className='absolute inset-0 flex items-center justify-center transition-all duration-300'
                      >
                        <div
                          className={`w-[72%] h-[72%] rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 ${cell.color === 'red'
                            ? 'bg-red-500 ring-2 ring-red-300/50'
                            : 'bg-zinc-900 ring-2 ring-white/30'}`}
                        >
                          {cell.king && (
                            <i
                              className='fa-solid fa-star text-yellow-400 text-xs absolute z-10 opacity-90'
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {!winner && (
            <p className='mt-8 text-zinc-500 text-sm font-medium text-center'>
              {selected
                ? 'Tap a highlighted square to move your piece.'
                : `Select a ${turn === 'red' ? 'red' : 'black'} piece to begin.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
