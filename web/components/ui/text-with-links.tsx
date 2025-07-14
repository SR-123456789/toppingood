import React from 'react';

interface TextWithLinksProps {
  text: string;
  className?: string;
}

/**
 * テキスト内の改行とURLを処理するコンポーネント
 */
export function TextWithLinks({ text, className = "" }: TextWithLinksProps) {
  // URLの正規表現パターン
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  
  // テキストを改行で分割
  const lines = text.split('\n');
  
  // 各行でURLを検出してリンクに変換
  const processLine = (line: string, lineIndex: number) => {
    const parts = line.split(urlPattern);
    
    return parts.map((part, partIndex) => {
      if (urlPattern.test(part)) {
        return (
          <a
            key={`${lineIndex}-${partIndex}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {processLine(line, index)}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}
