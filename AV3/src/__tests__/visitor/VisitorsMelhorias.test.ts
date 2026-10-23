import Equipe from "../../Equipe/Modelo/equipe";
import MembroEquipe from "../../Equipe/Modelo/membroEquipe";
import { Papel } from "../../Equipe/Enum/papel";
import { novaAvaliacao, novoProfissional, novoProjeto } from "../../helpers/factories";
import CalculadorCompatibilidade from "../../Visitor/CalculadorCompatibilidade";
import GeradorRelatorio from "../../Visitor/GeradorRelatorio";
import ValidadorConscistencia from "../../Visitor/ValidadorConscistencia";

describe("Visitors (regras do PDF)", () => {
  const ana = novoProfissional({ id: "1", nome: "Ana", precoMedio: 4000 });
  const projeto = (orcamento: number) => {
    const p = novoProjeto({ orcamento, competenciasPorPapel: { [Papel.DIRETOR]: [], [Papel.EDITOR]: [] } });
    return p;
  };

  it("validador exige todos os papéis obrigatórios preenchidos", () => {
    const p = projeto(100000);
    p.equipe = new Equipe(new Date(), "formada", [new MembroEquipe(Papel.DIRETOR, false, ana)]);
    expect(p.aceitar(new ValidadorConscistencia())).toBe(false);
    p.equipe.membrosEquipe.push(new MembroEquipe(Papel.EDITOR, false, novoProfissional({ id: "2", nome: "Bia", precoMedio: 3000 })));
    expect(p.aceitar(new ValidadorConscistencia())).toBe(true);
  });

  it("validador reprova quando o orçamento é insuficiente", () => {
    const p = projeto(5000);
    p.equipe = new Equipe(new Date(), "formada", [
      new MembroEquipe(Papel.DIRETOR, false, ana),
      new MembroEquipe(Papel.EDITOR, false, novoProfissional({ id: "2", nome: "Bia", precoMedio: 3000 })),
    ]);
    expect(p.aceitar(new ValidadorConscistencia())).toBe(false);
  });

  it("relatório lista papel e nome de cada membro (sem [object Object])", () => {
    const p = projeto(100000);
    p.equipe = new Equipe(new Date(), "formada", [new MembroEquipe(Papel.DIRETOR, false, ana)]);
    const texto = p.aceitar(new GeradorRelatorio());
    expect(texto).toContain("DIRETOR: Ana");
    expect(texto).not.toContain("[object Object]");
    expect(projeto(1).aceitar(new GeradorRelatorio())).toContain("(sem equipe)");
  });

  it("compatibilidade não gera NaN para profissional sem avaliações", () => {
    expect(new CalculadorCompatibilidade().visitarProfissional(ana)).toBe(0);
    const p = projeto(100000);
    p.equipe = new Equipe(new Date(), "formada", [new MembroEquipe(Papel.DIRETOR, false,
      novoProfissional({ id: "3", nome: "C", avaliacoes: [novaAvaliacao(5, Papel.DIRETOR)] }))]);
    expect(p.aceitar(new CalculadorCompatibilidade())).toEqual([5]);
    expect(projeto(1).aceitar(new CalculadorCompatibilidade())).toEqual([]);
  });
});
