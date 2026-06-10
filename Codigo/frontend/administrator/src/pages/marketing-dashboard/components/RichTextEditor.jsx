import React, { useEffect, useRef } from 'react';
import Button from '../../../components/ui/Button';

const RichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (typeof value === 'string' && el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const commit = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange?.(el.innerHTML);
  };

  const exec = (command, commandValue) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, commandValue);
    commit();
  };

  const insertLink = () => {
    const url = window.prompt('URL do link');
    if (!url) return;
    exec('createLink', url);
  };

  const insertImage = () => {
    const url = window.prompt('URL da imagem');
    if (!url) return;
    exec('insertImage', url);
  };

  const insertTable = () => {
    const html =
      '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></table><p><br/></p>';
    exec('insertHTML', html);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-muted/40">
        <Button variant="outline" size="sm" onClick={() => exec('bold')} iconName="Bold" />
        <Button variant="outline" size="sm" onClick={() => exec('italic')} iconName="Italic" />
        <Button variant="outline" size="sm" onClick={() => exec('underline')} iconName="Underline" />

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={() => exec('formatBlock', 'h1')}>
          H1
        </Button>
        <Button variant="outline" size="sm" onClick={() => exec('formatBlock', 'h2')}>
          H2
        </Button>
        <Button variant="outline" size="sm" onClick={() => exec('formatBlock', 'p')}>
          P
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => exec('insertUnorderedList')}
          iconName="List"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => exec('insertOrderedList')}
          iconName="ListOrdered"
        />

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={insertLink} iconName="Link" />
        <Button variant="outline" size="sm" onClick={insertImage} iconName="Image" />
        <Button variant="outline" size="sm" onClick={insertTable} iconName="Table" />
      </div>

      <div
        ref={editorRef}
        className="min-h-[260px] p-4 prose prose-sm max-w-none focus:outline-none"
        contentEditable
        onInput={commit}
        onBlur={commit}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default RichTextEditor;

