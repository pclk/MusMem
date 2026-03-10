"use client";

interface WordDisplayProps {
  words: string[];
  currentWordIdx: number;
  currentCharIdx: number;
  typed: string[];
  showCursor?: boolean;
}

export default function WordDisplay({
  words,
  currentWordIdx,
  currentCharIdx,
  typed,
  showCursor = true,
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
            const isCursorHere = showCursor && isCurrentWord && charIdx === currentCharIdx;

            let charClass = "text-white";
            if (wordIdx < currentWordIdx || (isCurrentWord && charIdx < currentCharIdx && isTyped)) {
              charClass = isCorrect ? "text-zinc-600" : "text-red-500/80";
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
            <span className="text-red-500/80">
              {typed[wordIdx].slice(word.length)}
            </span>
          )}
          {/* Cursor at end of current word */}
          {showCursor &&
            wordIdx === currentWordIdx &&
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
