"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import { useRewriteCoverLetter, useUpdateApplication } from '../hooks/useApplications';
import { Loader2, Sparkles, Save, Check } from 'lucide-react';

export function CoverLetterEditor({ 
  applicationId, 
  initialContent 
}: { 
  applicationId: string;
  initialContent: string;
}) {
  const { mutate: rewrite, isPending: isRewriting } = useRewriteCoverLetter();
  const { mutate: updateApp, isPending: isSaving } = useUpdateApplication();
  
  const [customInstruction, setCustomInstruction] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Check if content is already HTML or raw text
  const formattedInitial = initialContent.trim().startsWith('<') 
    ? initialContent 
    : initialContent.split('\n\n').map(p => `<p>${p}</p>`).join('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: formattedInitial,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-p:leading-relaxed max-w-none focus:outline-none min-h-[300px]',
      },
    },
    onUpdate: () => {
      setIsSaved(false);
    }
  });

  // Keep editor in sync if initialContent changes entirely (like after re-running analysis)
  useEffect(() => {
    if (editor && initialContent) {
      const formatted = initialContent.trim().startsWith('<') 
        ? initialContent 
        : initialContent.split('\n\n').map(p => `<p>${p}</p>`).join('');
        
      // Only replace if content is vastly different to avoid cursor jumps
      if (editor.getHTML() !== formatted && !editor.isFocused) {
        editor.commands.setContent(formatted);
      }
    }
  }, [initialContent, editor]);

  const handleRewrite = (instruction: string) => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    // Full text
    const fullText = editor.getText();

    rewrite(
      { 
        id: applicationId, 
        payload: { 
          selected_text: selectedText, 
          full_context: fullText, 
          instruction 
        } 
      },
      {
        onSuccess: (data: any) => {
          // Replace selection with new text
          const newText = data.rewritten_text;
          editor.chain().focus().insertContent(newText).run();
        }
      }
    );
  };

  const handleSave = () => {
    if (!editor) return;
    
    const html = editor.getHTML();
    
    updateApp(
      { id: applicationId, payload: { cover_letter: html } },
      {
        onSuccess: () => {
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
        }
      }
    );
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative border border-outline-variant rounded-xl bg-surface flex flex-col w-full h-full">
      {/* Toolbar / Save Header */}
      <div className="flex items-center justify-between border-b border-outline-variant p-2 bg-surface-container-lowest rounded-t-xl shrink-0">
        <span className="text-body-sm font-medium text-on-surface-variant flex items-center gap-2 px-2">
          <Sparkles size={16} className="text-primary" />
          AI Co-Pilot Editor
        </span>
        <button
          onClick={handleSave}
          disabled={isSaving || isSaved}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : isSaved ? <Check size={16} /> : <Save size={16} />}
          {isSaving ? "Saving..." : isSaved ? "Saved!" : "Save Letter"}
        </button>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-y-auto">
        {editor && (
          <BubbleMenu 
            editor={editor} 
            className="flex items-center gap-2 bg-surface-container-high border border-outline-variant shadow-lg rounded-lg p-2"
          >
            {isRewriting ? (
              <div className="flex items-center gap-2 px-3 py-1 text-on-surface-variant text-sm">
                <Loader2 size={16} className="animate-spin" /> Rewriting...
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleRewrite("Make this sound more professional and confident")}
                  className="px-2.5 py-1.5 rounded-md hover:bg-surface-container-highest text-label-sm text-on-surface font-medium transition-colors"
                >
                  Professional
                </button>
                <button
                  onClick={() => handleRewrite("Make this shorter and more concise")}
                  className="px-2.5 py-1.5 rounded-md hover:bg-surface-container-highest text-label-sm text-on-surface font-medium transition-colors"
                >
                  Shorten
                </button>
                <div className="w-px h-6 bg-outline-variant mx-1"></div>
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    placeholder="Custom instruction..." 
                    value={customInstruction}
                    onChange={e => setCustomInstruction(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customInstruction) {
                        handleRewrite(customInstruction);
                        setCustomInstruction("");
                      }
                    }}
                    className="bg-surface border border-outline-variant text-on-surface rounded px-2 py-1 text-sm w-36 focus:outline-none focus:border-primary placeholder:text-on-surface-variant/50"
                  />
                  <button 
                    onClick={() => {
                      if (customInstruction) {
                        handleRewrite(customInstruction);
                        setCustomInstruction("");
                      }
                    }}
                    className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                  >
                    <Sparkles size={16} />
                  </button>
                </div>
              </>
            )}
          </BubbleMenu>
        )}
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
