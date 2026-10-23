import Equipe from "../../Equipe/Modelo/equipe";
import EventoRecomendacao, { TiposEvento } from "../../Observer/EventoRecomendacao";
import PublicadorEventos, { BarramentoEmMemoria } from "../../Observer/PublicadorEventos";
import SistemaRecomendacao from "../../SistemaRecomendacao/SistemaRecomendacao";
import { Papel } from "../../Equipe/Enum/papel";
import { novoProfissional, novoProjeto } from "../../helpers/factories";

describe("Barramento de eventos (EventEmitter)", () => {
  it("o PublicadorEventos repassa cada evento aos assinantes do tipo e ao curinga '*'", () => {
    const barramento = new BarramentoEmMemoria();
    const doTipo = jest.fn(); const todos = jest.fn(); const outro = jest.fn();
    barramento.assinar(TiposEvento.RECOMENDACAO, doTipo);
    barramento.assinar("*", todos);
    barramento.assinar(TiposEvento.EQUIPE_CONFIRMADA, outro);

    new PublicadorEventos(barramento).atualizar(new EventoRecomendacao(TiposEvento.RECOMENDACAO, new Equipe(new Date(), "formada", []), "teste"));

    expect(doTipo).toHaveBeenCalledTimes(1);
    expect(todos).toHaveBeenCalledTimes(1);
    expect(outro).not.toHaveBeenCalled();
  });

  it("integra com o SistemaRecomendacao como mais um observador", () => {
    const barramento = new BarramentoEmMemoria();
    const recebido = jest.fn();
    barramento.assinar("*", recebido);
    const ana = novoProfissional({ id: "1", nome: "Ana" });
    const sistema = new SistemaRecomendacao([new PublicadorEventos(barramento)]);
    sistema.executarEstrategia(novoProjeto({ competenciasPorPapel: { [Papel.DIRETOR]: [] } }), [ana],
      { recomendar: () => new Map([[Papel.DIRETOR, ana]]) });
    jest.spyOn(console, "log").mockImplementation(() => {});
    expect(recebido).toHaveBeenCalledTimes(1);
  });
});
