import { ControllerModel } from './contracts';
import { quoteSingle, toSafeIdentifier } from './helpers';

function renderGetwiLines(entries: string[], indent = ''): string {
  if (entries.length === 0) {
    return `${indent}<%_ /* no entries */ _%>\n`;
  }

  return entries.map(entry => `${indent}<%- await getwi(null, ${quoteSingle(entry)}) %>`).join('\n') + '\n';
}

function fallbackSyntaxCheck(content: string) {
  const openCount = (content.match(/<%/g) ?? []).length;
  const closeCount = (content.match(/%>/g) ?? []).length;
  if (openCount === 0 || openCount !== closeCount) {
    throw new Error('EJS syntax check failed: tag count mismatch');
  }
  if (!content.includes('getwi(')) {
    throw new Error('EJS syntax check failed: missing getwi() call');
  }
}

export async function validateEjsTemplate(content: string): Promise<void> {
  const checker = _.get(window, 'EjsTemplate.getSyntaxErrorInfo');
  if (_.isFunction(checker)) {
    const error = await checker(content, 4);
    if (typeof error === 'string' && error.trim()) {
      throw new Error(`EJS syntax check failed: ${error}`);
    }
    return;
  }

  fallbackSyntaxCheck(content);
}

export async function renderControllerTemplate(model: ControllerModel): Promise<string> {
  if (model.template_id !== 'entry_selector_v1') {
    throw new Error(`unsupported controller template: ${model.template_id}`);
  }

  const declarations = model.variables
    .map(variable => {
      const identifier = toSafeIdentifier(variable.name);
      return `if (typeof ${identifier} === 'undefined') var ${identifier} = getvar(${quoteSingle(variable.path)}, { defaults: ${JSON.stringify(variable.default)} });`;
    })
    .join('\n');

  let body = '';
  if (model.rules.length === 0) {
    body += renderGetwiLines(model.fallback_entries);
  } else {
    model.rules.forEach((rule, index) => {
      const branch = index === 0 ? 'if' : 'else if';
      body += `<%_ ${branch} (${rule.when}) { _%>\n`;
      body += renderGetwiLines(rule.include_entries);
      body += `<%_ } `;

      if (index === model.rules.length - 1) {
        body += `else { _%>\n`;
        body += renderGetwiLines(model.fallback_entries);
        body += `<%_ } _%>\n`;
      } else {
        body += `_%>\n`;
      }
    });
  }

  const template = `<%_\n${declarations}\n_%>\n\n${body}`;
  await validateEjsTemplate(template);
  return template;
}
