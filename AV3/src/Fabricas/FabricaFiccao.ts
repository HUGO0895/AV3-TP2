import ValidadorConscistencia from '../Visitor/ValidadorConscistencia'
import Observador from '../Observer/Observador'
import { TipoProjeto } from '../Projetos/Enum/TipoProjeto'
import Projeto from '../Projetos/Modelo/projetos'
import RecomendacaoStrategy from '../Strategy/RecomendacaoStrategy'
import SimiliaridadeCosseno from '../Strategy/SimiliaridadedeCosseno'
import VisitanteProjeto from '../Visitor/VisitanteProjeto'
import FabricaProjeto, { DadosProjeto } from './FabricaProjeto'
import NotificadorFiccao from './Notificadores/NotificadorFiccao'

/**
 * Família "genérica" (comportamento original do sistema): projeto sem atributos extras,
 * validador geral e a estratégia do cliente sem alterações.
 */
export default class FabricaFiccao extends FabricaProjeto{
     readonly tipo=TipoProjeto.FICCAO

     criarProjeto(d:DadosProjeto):Projeto{
          return new Projeto(d.id,d.genero,d.duracaoMin,d.orcamento,d.prazo,TipoProjeto.FICCAO,d.competencias,undefined,d.estrategia,d.pesos)
     }
     criarValidador():VisitanteProjeto{ return new ValidadorConscistencia() }
     criarRecomendador(base?:RecomendacaoStrategy):RecomendacaoStrategy{ return base ?? new SimiliaridadeCosseno() }
     criarNotificador():Observador{ return new NotificadorFiccao() }
}
