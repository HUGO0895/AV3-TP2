import Profissional from "../Equipe/Modelo/Profissional";
import { Genero } from "../Projetos/Enum/TipoGenero";
import Projeto from "../Projetos/Modelo/projetos";
import { ProfissionalProvider } from "../servico/ServiceRecomendacao";
import ProfissionaisRepositorio from "./profissionaisRepositorio";

/** Adaptador de infraestrutura: converte entidades TypeORM em modelos de domínio. */
export default class ProfissionalProviderTypeorm implements ProfissionalProvider {
    constructor(private repositorio: ProfissionaisRepositorio = new ProfissionaisRepositorio()) {}

    async buscarTodos(): Promise<Array<Profissional>> {
        const entidades = await this.repositorio.find()
        return entidades.map((prof) => new Profissional(
            prof.id.toString(),
            prof.nome,
            prof.competencias.map((cp) => ({ nome: cp.competencia.nome, nivel: cp.nivel })),
            { inicio: prof.disponibilidadeInicio, final: prof.disponibilidadeFinal },
            prof.precoMedio,
            prof.avaliacao.map((av) => ({
                notaDoProfissional: av.notaDoProfissional,
                comentario: av.comentario,
                data: av.data,
                papel: av.papel,
                ProjetoAvaliador: new Projeto(
                    av.ProjetoAvaliador.id.toString(),
                    av.ProjetoAvaliador.genero as Genero,
                    av.ProjetoAvaliador.duracaoMin,
                    av.ProjetoAvaliador.orcamento,
                    av.ProjetoAvaliador.prazo,
                    av.ProjetoAvaliador.tipo
                ),
            }))
        ))
    }
}
