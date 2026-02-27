"use client";

interface WordDisplayProps {
  words: string[];
  currentWordIdx: number;
  currentCharIdx: number;
  typed: string[];
}

export default function WordDisplay({
  words,
  currentWordIdx,
  currentCharIdx,
  typed,
}: WordDisplayProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 text-2xl leading-relaxed font-mono select-none">
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="relative inline-block">
          {word.split("").map((char, charIdx) => {
            const isCurrentWord = wordIdx === currentWordIdx;
            const typedWord = typed[wordIdx] || "";
            const typedChar = typedWord[charIdx];
            const isTyped = typedChar !== undefined;
            const isCorrect = typedChar === char;
            const isCursorHere = isCurrentWord && charIdx === currentCharIdx;

            let charClass = "text-zinc-500"; // untyped
            if (wordIdx < currentWordIdx || (isCurrentWord && charIdx < currentCharIdx && isTyped)) {
              // Already typed
              if (isTyped && isCorrect) {
                charClass = "text-zinc-600"; // correct - dim
              } else if (isTyped && !isCorrect) {
                charClass = "text-red-500/70"; // incorrect
              } else if (!isTyped && wordIdx < currentWordIdx) {
                charClass = "text-red-500/70"; // skipped
              }
            }

            return (
              <span key={charIdx} className="relative">
                {isCursorHere && (
                  <span className="absolute -left-px top-0 w-0.5 h-full bg-emerald-400 animate-pulse" />
                )}
                <span className={`${charClass} transition-colors duration-75`}>
                  {char}
                </span>
              </span>
            );
          })}
          {/* Show extra typed characters beyond word length */}
          {typed[wordIdx] && typed[wordIdx].length > word.length && (
            <span className="text-red-500/70">
              {typed[wordIdx].slice(word.length)}
            </span>
          )}
          {/* Cursor at end of current word */}
          {wordIdx === currentWordIdx &&
            currentCharIdx === word.length && (
              <span className="relative">
                <span className="absolute -left-px top-0 w-0.5 h-full bg-emerald-400 animate-pulse" />
              </span>
            )}
        </span>
      ))}
    </div>
  );
}
