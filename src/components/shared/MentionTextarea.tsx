import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useAssignableUsers } from "@/components/shared/AssigneeSelect";

const normalizeMentionText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const initialsFor = (name: string) =>
  normalizeMentionText(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("");

const hasMention = (text: string, name: string) => {
  const haystack = normalizeMentionText(text);
  const needle = `@${normalizeMentionText(name)}`;
  if (needle === "@") return false;

  let index = haystack.indexOf(needle);
  while (index !== -1) {
    const next = haystack[index + needle.length];
    if (!next || !/[a-z0-9]/.test(next)) return true;
    index = haystack.indexOf(needle, index + 1);
  }
  return false;
};

export interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (userIds: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  suggestionsClassName?: string;
}

/**
 * Lightweight textarea that supports @mention autocomplete.
 * - Type "@" to open a popover with active users.
 * - Selecting a user inserts "@Full Name " into the text and tracks the user's id.
 * - Mentions are detected by matching "@Full Name" substrings on the final text,
 *   so editing/deleting parts of a mention removes it automatically.
 */
export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  rows = 3,
  className,
  disabled,
  onBlur,
  suggestionsClassName,
}: MentionTextareaProps) {
  const users = useAssignableUsers();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchorIdx, setAnchorIdx] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(0);

  // Derive mentioned user ids from the final text so deletions clean up.
  const mentionedIds = useMemo(() => {
    if (!value) return [];
    const ids: string[] = [];
    for (const u of users) {
      const name = u.full_name?.trim();
      if (!name) continue;
      if (hasMention(value, name)) ids.push(u.id);
    }
    return Array.from(new Set(ids));
  }, [value, users]);

  useEffect(() => {
    onMentionsChange?.(mentionedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentionedIds.join(",")]);

  const filtered = useMemo(() => {
    const q = normalizeMentionText(query);
    return users
      .filter((u) => {
        const name = u.full_name?.trim();
        if (!name) return false;
        const normalizedName = normalizeMentionText(name);
        return !q || normalizedName.includes(q) || initialsFor(name).startsWith(q);
      })
      .slice(0, 8);
  }, [users, query]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    const caret = e.target.selectionStart ?? next.length;
    // Find the nearest @ before caret without an intervening whitespace.
    let i = caret - 1;
    let foundAt = -1;
    while (i >= 0) {
      const ch = next[i];
      if (ch === "@") {
        foundAt = i;
        break;
      }
      if (ch === "\n" || ch === " " || ch === "\t") break;
      i--;
    }
    if (foundAt >= 0) {
      const q = next.slice(foundAt + 1, caret);
      if (q.length <= 40 && !q.includes("\n")) {
        setAnchorIdx(foundAt);
        setQuery(q);
        setOpen(true);
        setHighlight(0);
        return;
      }
    }
    setOpen(false);
  };

  const insertMention = (userIdx: number) => {
    const user = filtered[userIdx];
    const name = user?.full_name?.trim();
    if (!name || anchorIdx == null || !textareaRef.current) return;
    const caret = textareaRef.current.selectionStart ?? value.length;
    const before = value.slice(0, anchorIdx);
    const after = value.slice(caret);
    const insert = `@${name} `;
    const next = before + insert + after;
    onChange(next);
    onMentionsChange?.(Array.from(new Set([...mentionedIds, user.id])));
    setOpen(false);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const pos = (before + insert).length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(highlight);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
          onBlur?.();
        }}
        placeholder={placeholder}
        rows={rows}
        className={className}
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <div
          className={`absolute z-[70] mt-1 w-72 max-h-64 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg ${suggestionsClassName ?? ""}`}
        >
          {filtered.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(i);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${i === highlight ? "bg-accent" : ""}`}
            >
              <span className="font-medium">{u.full_name}</span>
              <span className="block text-[11px] text-muted-foreground">Usuário do sistema</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
