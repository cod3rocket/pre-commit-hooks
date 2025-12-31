import {$} from "bun";
import * as path from "node:path";

// Utilitários de cor para o terminal
const col = {
  red: (txt: string) => `\x1b[31m${txt}\x1b[0m`,
  green: (txt: string) => `\x1b[32m${txt}\x1b[0m`,
  yellow: (txt: string) => `\x1b[33m${txt}\x1b[0m`,
  blue: (txt: string) => `\x1b[34m${txt}\x1b[0m`,
  dim: (txt: string) => `\x1b[2m${txt}\x1b[0m`,
};

enum HookName {
  KtLint = "KtLint",
  OpenTofu = "OpenTofu",
}

interface Hook {
  include: RegExp;

  run(filePaths: string[]): Promise<number>;
}

const hooks: Record<HookName, Hook> = {
  [HookName.KtLint]: {
    include: /\.kts?$/,
    async run(filePaths: string[]): Promise<number> {
      if (filePaths.length === 0) return 0;

      console.log(col.blue(`ℹ️  Rodando KtLint em ${filePaths.length} arquivos...`));
      // Adicionado --relative para output mais limpo, se suportado, ou mantenha paths absolutos
      const {exitCode} = await $`ktlint -F ${filePaths}`.nothrow();
      return exitCode;
    },
  },
  [HookName.OpenTofu]: {
    // Melhorado regex para pegar extensões corretamente e fixado o fim da string ($)
    include: /\.(tf|tofu|tfvars|tftest\.hcl)$/,
    async run(filePaths: string[]): Promise<number> {
      if (filePaths.length === 0) return 0;

      console.log(col.blue(`ℹ️  Rodando OpenTofu fmt em ${filePaths.length} arquivos...`));
      // Removido -recursive, pois estamos passando arquivos específicos
      const {exitCode} = await $`tofu fmt ${filePaths}`.nothrow();
      return exitCode;
    },
  },
};

async function runGitLeaks(): Promise<boolean> {
  console.log(col.dim("🔒 Verificando segredos com Gitleaks..."));

  // 2. Uso do comando 'git' e captura de output (.quiet())
  // O .quiet() impede que o stdout vazie no terminal a menos que a gente mande
  const {exitCode, stdout, stderr} = await $`gitleaks git --pre-commit --redact --staged --verbose --no-banner`.quiet().nothrow();

  if (exitCode !== 0) {
    console.error(col.red("\n❌ Gitleaks detectou segredos no código!"));
    // Só mostramos o log se houver erro
    console.log(stdout.toString());
    console.log(stderr.toString());
    return false;
  }

  return true;
}

async function main(args: string[]) {
  // slice é mais seguro que splice para não mutar o argv original, embora splice funcione
  const sources = args.slice(2);

  if (sources.length === 0) {
    // Se não houver arquivos na staged area passados pelo lint-staged ou similar
    console.log(col.dim("⏭️  Nenhum arquivo para verificar."));
    process.exit(0);
  }

  // 1. Segurança Primeiro
  const isSecure = await runGitLeaks();
  if (!isSecure) {
    // Segurança é prioridade: se falhar, aborta tudo imediatamente.
    process.exit(1);
  }

  const filesPaths = sources.map((source) => path.resolve(source));
  let hasFailure = false;

  // 2. Execução dos Hooks
  for (const [name, hook] of Object.entries(hooks)) {
    const parsedFiles = filesPaths.filter((filePath) => hook.include.test(filePath));

    // Pula se não houver arquivos para este hook
    if (parsedFiles.length === 0) continue;

    const exitCode = await hook.run(parsedFiles);

    if (exitCode !== 0) {
      console.error(col.red(`❌ Falha na execução do hook: ${name}`));
      hasFailure = true;
    } else {
      console.log(col.green(`✅ ${name} executado com sucesso.`));
    }
  }

  // 3. Saída Final
  if (hasFailure) {
    console.error(col.red("\n⛔ O commit foi abortado devido a erros nos hooks."));
    process.exit(1);
  }

  console.log(col.green("\n✨ Todos as verificações passaram!"));
}

await main(process.argv);
