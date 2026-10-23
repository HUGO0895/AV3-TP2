import Observador from '../Observer/Observador'
import { TipoProjeto } from '../Projetos/Enum/TipoProjeto'
import Projeto from '../Projetos/Modelo/projetos'
import ProjetoAnimacao from '../Projetos/Modelo/ProjetoAnimacao'
import RecomendacaoStrategy from '../Strategy/RecomendacaoStrategy'
import VisitanteProjeto from '../Visitor/VisitanteProjeto'
import FabricaProjeto, { DadosProjeto } from './FabricaProjeto'
import NotificadorAnimacao from './Notificadores/NotificadorAnimacao'
import RecomendadorAnimacao from './Recomendadores/RecomendadorAnimacao'
import ValidadorAnimacao from './Validadores/ValidadorAnimacao'

export default class FabricaAnimacao extends FabricaProjeto{
     readonly tipo=TipoProjeto.ANIMACAO

     criarProjeto(d:DadosProjeto):Projeto{
          return new ProjetoAnimacao(d.id,d.genero,d.duracaoMin,d.orcamento,d.prazo,d.competencias,undefined,d.estrategia,d.pesos)
               .aplicarAjustes({detalhes:d.detalhes})
     }
     criarValidador():VisitanteProjeto{ return new ValidadorAnimacao() }
     criarRecomendador(base?:RecomendacaoStrategy):RecomendacaoStrategy{ return new RecomendadorAnimacao(base) }
     criarNotificador():Observador{ return new NotificadorAnimacao() }
}
