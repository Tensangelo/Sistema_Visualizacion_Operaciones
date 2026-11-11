// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardFooter } from "@/features/dashboard/components/DashboardFooter";

describe("DashboardFooter", () => {
  it("shows the attribution and accessible links to the profile and repository", () => {
    render(<DashboardFooter />);

    expect(screen.getByText("Angelo Gaona")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Perfil de GitHub de Angelo Gaona" }).getAttribute("href")).toBe(
      "https://github.com/Tensangelo",
    );
    expect(screen.getByRole("link", { name: "Repositorio en GitHub" }).getAttribute("href")).toBe(
      "https://github.com/Tensangelo/Sistema_Visualizacion_Operaciones",
    );
  });
});
