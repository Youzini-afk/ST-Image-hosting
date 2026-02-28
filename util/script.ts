import iframe_srcdoc from './iframe_srcdoc.html';

export async function loadReadme(url: string): Promise<boolean> {
  const readme = await fetch(url);
  if (!readme.ok) {
    return false;
  }
  const readme_text = await readme.text();
  replaceScriptInfo(readme_text);
  return true;
}

export function teleportStyle(
  append_to: JQuery.Selector | JQuery.htmlString | JQuery.TypeOrArray<Element | DocumentFragment> | JQuery = 'head',
): { destroy: () => void } {
  const scriptId = getScriptId();
  const resetStyleSnippet = 'html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;}';
  const appStyleMarkers = ['.preset-root', '.settings-panel', '.prompt-panel', '.edit-shell', '.guard-mask'];
  const $scriptStyles = $(`head > style[script_id="${scriptId}"]`, document);
  const $fallbackStyles = $(`head > style`, document).filter((_, element) => {
    const text = (element as HTMLStyleElement).textContent ?? '';
    if (text.includes(resetStyleSnippet)) {
      return false;
    }
    return appStyleMarkers.some(marker => text.includes(marker));
  });
  const $styles = $scriptStyles.length > 0 ? $scriptStyles : $fallbackStyles;

  const $div = $(`<div>`)
    .attr('script_id', scriptId)
    .append($styles.clone())
    .appendTo(append_to);

  return {
    destroy: () => $div.remove(),
  };
}

export function createScriptIdIframe(): JQuery<HTMLIFrameElement> {
  return $(`<iframe>`).attr({
    script_id: getScriptId(),
    frameborder: 0,
    srcdoc: iframe_srcdoc,
  }) as JQuery<HTMLIFrameElement>;
}

export function createScriptIdDiv(): JQuery<HTMLDivElement> {
  return $('<div>').attr('script_id', getScriptId()) as JQuery<HTMLDivElement>;
}

export function reloadOnChatChange(): EventOnReturn {
  let chat_id = SillyTavern.getCurrentChatId();
  return eventOn(tavern_events.CHAT_CHANGED, new_chat_id => {
    if (chat_id !== new_chat_id) {
      chat_id = new_chat_id;
      window.location.reload();
    }
  });
}
