import { GitHubIcon } from "@/shared/assets/github";
import { SourceIcon } from "@/shared/assets/source";

const githubProfileUrl = "https://github.com/Tensangelo";
const repositoryUrl =
  "https://github.com/Tensangelo/Sistema_Visualizacion_Operaciones";

export function DashboardFooter() {
  return (
    <footer className="mt-12 border-t border-outline">
      <div className="mx-auto flex items-center w-full max-w-7xl flex-col gap-4 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-muted">
          Desarrollado por{" "}
          <span className="font-semibold text-foreground">Angelo Gaona</span>
        </p>
        <nav
          aria-label="Enlaces del desarrollador"
          className="flex flex-wrap items-center gap-2"
        >
          <a
            aria-label="Perfil de GitHub de Angelo Gaona"
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href={githubProfileUrl}
            rel="noreferrer"
            target="_blank"
          >
            <GitHubIcon />
          </a>
          <a
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href={repositoryUrl}
            rel="noreferrer"
            target="_blank"
          >
            <SourceIcon />
          </a>
        </nav>
      </div>
    </footer>
  );
}
