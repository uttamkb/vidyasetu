"use client";

import React from "react";
import katex from "katex";

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * MathRenderer component that parses and renders LaTeX math in a string.
 * Supports inline math: \( ... \)
 * Supports block math: \[ ... \]
 */
const formatText = (text: string) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-900 dark:text-slate-100">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-primary font-medium">$1</em>');
};

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  if (!content) return null;

  // Regex to find math delimiters ($$, \[, $, \() OR legacy patterns like sqrt(x)
  const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$.*?\$|\\\(.*?\\\)|sqrt\([^)]+\)|\d+\^[\d/]+|\d+\^\{[^}]+\})/g;
  const parts = content.split(mathRegex);

  return (
    <div className={className}>
      {parts.map((part, index) => {
        const isDoubleDollar = part.startsWith("$$") && part.endsWith("$$");
        const isBlock = (part.startsWith("\\[") && part.endsWith("\\]")) || isDoubleDollar;
        const isSingleDollar = part.startsWith("$") && part.endsWith("$");
        const isInline = (part.startsWith("\\(") && part.endsWith("\\)")) || isSingleDollar;
        const isLegacySqrt = part.startsWith("sqrt(");
        const isLegacyExp = part.includes("^") && !isInline && !isBlock;

        if (isBlock || isInline || isLegacySqrt || isLegacyExp) {
          try {
            let math = part;
            if (isDoubleDollar) {
              math = part.slice(2, -2);
            } else if (part.startsWith("\\[") && part.endsWith("\\]")) {
              math = part.slice(2, -2);
            } else if (isSingleDollar) {
              math = part.slice(1, -1);
            } else if (part.startsWith("\\(") && part.endsWith("\\)")) {
              math = part.slice(2, -2);
            } else if (isLegacySqrt) {
              math = part.replace("sqrt(", "\\sqrt{").replace(/\)$/, "}");
            } else if (isLegacyExp) {
              math = part.replace("^", "^{").concat("}");
            }

            const html = katex.renderToString(math, {
              displayMode: isBlock,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                className={isBlock ? "block my-4 overflow-x-auto" : "inline-block px-0.5"}
              />
            );
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }

        return (
          <span 
            key={index} 
            dangerouslySetInnerHTML={{ __html: formatText(part) }}
          />
        );
      })}
    </div>
  );
}
