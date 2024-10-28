import { join, parse } from 'node:path';
import colors from 'colors/safe';
import { existsSync, outputFileSync, readFileSync, writeFileSync } from 'fs-extra';
import inquirer from 'inquirer';
import * as ts from 'typescript';

import TSX from './templates/RouteTemplate.tsx';
import SCSS from './templates/RouteTemplate.module.scss.js';

const root = parse(process.cwd()).root;
function checkPackageJson(path: string) {
  if (existsSync(join(path, 'package.json'))) {
    return path;
  }
  if (path === root) {
    throw new Error('Project directory not found!');
  }
  return checkPackageJson(join(path, '..'));
}
let projectRoot: string;

function readIntoSourceFile(filePath: string): ts.SourceFile {
  const text = readFileSync(filePath, { encoding: 'utf8' });
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
}

function getSourceNodes(sourceFile: ts.SourceFile): ts.Node[] {
  const nodes: ts.Node[] = [sourceFile];
  const result = [];

  while (nodes.length > 0) {
    const node = nodes.shift();

    if (node) {
      result.push(node);
      if (node.getChildCount(sourceFile) >= 0) {
        nodes.unshift(...node.getChildren());
      }
    }
  }

  return result;
}

function findExpressionNode(node: ts.Node, kind: ts.SyntaxKind) {
  let nodeSiblings = node.parent.getChildren();
  const nodeIndex = nodeSiblings.indexOf(node);
  nodeSiblings = nodeSiblings.slice(nodeIndex);
  return nodeSiblings.find((n) => n.kind === kind);
}

function updateACL(path: string, acl: string) {
  if (acl) {
    const sourceFilePath = join(projectRoot, 'src/app/configs/acl.ts');
    const sourceFile = readIntoSourceFile(sourceFilePath);
    const nodes = getSourceNodes(sourceFile);
    const node = nodes.find((n) => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'ROUTES_ACL');
    const expressionNode = findExpressionNode(node, ts.SyntaxKind.ObjectLiteralExpression);

    const acls = acl.split(',').map((s) => `'${s.trim()}'`);
    const insert = `
  '${path}': ${acls.length === 1 ? acls[0] : `[${acls.join(', ')}]`},`;
    writeFileSync(
      sourceFilePath,
      sourceFile.text.slice(0, expressionNode.getStart() + 1) + insert + sourceFile.text.slice(expressionNode.getStart() + 1),
    );
  }
}

function updateMenu(path: string, acl: string, i18n: boolean, title: string) {
  const sourceFilePath = join(projectRoot, 'src/app/configs/menu.ts');
  const sourceFile = readIntoSourceFile(sourceFilePath);
  const nodes = getSourceNodes(sourceFile);
  const node = nodes.find((n) => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'MENU');
  const expressionNode = findExpressionNode(node, ts.SyntaxKind.ArrayLiteralExpression);

  const insert = `
  {
    path: '${path}',
    type: 'item',
    title${i18n ? 'I18n' : ''}: '${title}',
    ${acl ? `acl: ROUTES_ACL['${path}'],` : ''}
  },`;
  writeFileSync(
    sourceFilePath,
    sourceFile.text.slice(0, expressionNode.getStart() + 1) + insert + sourceFile.text.slice(expressionNode.getStart() + 1),
  );
}

function updateRouter(path: string, acl: string, i18n: boolean, title: string) {
  const sourceFilePath = join(projectRoot, 'src/app/routes/Router.tsx');
  const sourceFile = readIntoSourceFile(sourceFilePath);
  const nodes = getSourceNodes(sourceFile);

  let source = sourceFile.text;

  const node2 = nodes.find((n) => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'routes');
  const expressionNode2: ts.Node = (findExpressionNode(node2, ts.SyntaxKind.JsxExpression) as any).expression;
  const insert2 = `
        {
          path: '${path}',
          element: <AppRoute path="${path}" />,
          data: {
            title: ${i18n ? `t('${title}', { ns: 'title' })` : `'${title}'`},
            ${
              acl
                ? `acl: ROUTES_ACL['${path}'],
            canActivate: [ACLGuard],`
                : ''
            }
          },
        },`;
  source = source.slice(0, expressionNode2.getStart() + 1) + insert2 + source.slice(expressionNode2.getStart() + 1);

  const node1 = nodes.find((n) => n.kind === ts.SyntaxKind.Identifier && n.getText() === 'ROUTES');
  const expressionNode1 = findExpressionNode(node1, ts.SyntaxKind.ObjectLiteralExpression);
  const paths = path.split('/').filter((s) => s);
  if (paths[paths.length - 1] === ':id') {
    paths[paths.length - 1] = 'detail';
  }
  const component = paths[paths.length - 1]
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + String(s).slice(1))
    .join('');
  const insert1 = `
  '${path}': lazy(() => import('./${paths.join('/')}/${component}')),`;
  source = source.slice(0, expressionNode1.getStart() + 1) + insert1 + source.slice(expressionNode1.getStart() + 1);

  writeFileSync(sourceFilePath, source);

  const routePath = join(projectRoot, 'src/app/routes');
  outputFileSync(join(routePath, ...paths, `${component}.module.scss`), SCSS.replace('route-template', paths[paths.length - 1]));
  outputFileSync(
    join(routePath, ...paths, `${component}.tsx`),
    TSX.replace(
      '../../../components',
      Array.from({ length: paths.length + 1 })
        .fill('../')
        .join('') + 'components',
    )
      .replace(/RouteTemplate/g, component)
      .replace('list={[]}', `list={[{ id: '${path}', title: ${i18n ? `t('${title}', { ns: 'title' })` : `'${title}'`} }]}`)
      .replace('route-template', paths[paths.length - 1]),
  );
}

export async function onRoute() {
  try {
    projectRoot = checkPackageJson(process.cwd());

    console.log(colors.cyan("\nLet's create a new route\n"));
    const _info = await inquirer.prompt([
      {
        name: 'path',
        type: 'input',
        message: 'What is your route path?',
        validate: (value) => {
          const path = value.trim();
          if (path === '') {
            return 'Please enter the path!';
          }
          return true;
        },
      },
      {
        name: 'acl',
        type: 'input',
        message: 'What are your route permissions?',
      },
      {
        name: 'i18n',
        type: 'confirm',
        message: 'Whether to support internationalization?',
      },
      {
        name: 'title',
        type: 'input',
        message: 'What is your route title?',
        validate: (value) => {
          const title = value.trim();
          if (title === '') {
            return 'Please enter the title!';
          }
          return true;
        },
      },
    ]);
    const info = {
      path: _info.path.trim(),
      acl: _info.acl.trim(),
      i18n: _info.i18n,
      title: _info.title.trim(),
    };

    updateACL(info.path, info.acl);
    updateMenu(info.path, info.acl, info.i18n, info.title);
    updateRouter(info.path, info.acl, info.i18n, info.title);

    console.log(colors.green('\nSuccessfully create route!'));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
