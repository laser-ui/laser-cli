import { execSync } from 'node:child_process';
import { join } from 'node:path';
import colors from 'colors/safe';
import { existsSync, readFile, rm, writeFile } from 'fs-extra';
import inquirer from 'inquirer';

export async function onCreate() {
  try {
    const _info = await inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Where would you like to create your project?',
        validate: (value) => {
          const name = value.trim();
          if (name === '') {
            return 'Please enter the project name!';
          }
          if (existsSync(join(process.cwd(), name))) {
            return 'Directory already exists!';
          }
          return true;
        },
      },
      {
        name: 'app',
        type: 'input',
        message: 'What is your application name?',
        validate: (value) => {
          const name = value.trim();
          if (name === '') {
            return 'Please enter the application name!';
          }
          return true;
        },
      },
    ]);
    const info = {
      name: _info.name.trim(),
      app: _info.app.trim(),
    };

    console.log(colors.cyan('\nCloning laser-admin...'));
    const githubUrl = 'https://github.com/laser-ui/laser-admin.git';
    execSync(`git clone ${githubUrl} ${info.name}`, { stdio: 'inherit' });

    const projectPath = join(process.cwd(), info.name);

    await rm(join(projectPath, '.git'), { recursive: true, force: true });

    await Promise.all(
      ['.github', 'LICENSE', 'README.md', 'README.zh-CN.md'].map((path) => rm(join(projectPath, path), { recursive: true, force: true })),
    );

    await Promise.all(
      ['nx.json', 'package.json', 'project.json', 'vite.config.ts'].map(async (path) => {
        const filePath = join(projectPath, path);
        const data = await readFile(filePath, 'utf8');
        const result = data.replace(/laser-admin/g, info.name);
        await writeFile(filePath, result);
      }),
    );

    await Promise.all(
      ['index.html', 'src/app/configs/app.ts'].map(async (path) => {
        const filePath = join(projectPath, path);
        const data = await readFile(filePath, 'utf8');
        const result = data.replace(/Laser Admin/g, info.app);
        await writeFile(filePath, result);
      }),
    );

    execSync(`git init -b main`, { cwd: projectPath });
    execSync(`git add .`, { cwd: projectPath });
    execSync(`git commit -m "Initial commit"`, { cwd: projectPath });

    console.log(colors.green('\nSuccessfully create project!'));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
