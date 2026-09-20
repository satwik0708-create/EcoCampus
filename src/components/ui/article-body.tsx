/**
 * Renders stored article text.
 *
 * Content is treated as plain text, never as HTML — administrator-authored
 * markup is not injected into the page, which removes stored-XSS as a
 * concern entirely. A small, fixed subset of structure is recognised:
 * `## ` headings, `- ` bullets and blank-line-separated paragraphs.
 */
export function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={index} className="text-lg font-semibold tracking-tight">
              {block.slice(3).trim()}
            </h2>
          );
        }

        const lines = block.split("\n").map((line) => line.trim());
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="space-y-1.5">
              {lines.map((line, lineIndex) => (
                <li
                  key={lineIndex}
                  className="text-muted-foreground flex items-start gap-2.5 text-sm leading-relaxed"
                >
                  <span
                    aria-hidden="true"
                    className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                  />
                  {line.slice(2).trim()}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-muted-foreground text-sm leading-relaxed">
            {block}
          </p>
        );
      })}
    </div>
  );
}
