import Observador from '../Observer/Observador'
import { TipoProjeto } from '../Projetos/Enum/TipoProjeto'
import Projeto from '../Projetos/Modelo/projetos'
import ProjetoPublicitario from '../Projetos/Modelo/ProjetoPublicitario'
import RecomendacaoStrategy from '../Strategy/RecomendacaoStrategy'
import VisitanteProjeto from '../Visitor/VisitanteProjeto'
import FabricaProjeto, { DadosProjeto } from './FabricaProjeto'
import NotificadorPublicitario from './Notificadores/NotificadorPublicitario'
import RecomendadorPublicitario from './Recomendadores/RecomendadorPublicitario'
import ValidadorPublicitario from './Validadores/ValidadorPublicitario'

export default class FabricaPublicitario extends FabricaProjeto{
     readonly tipo=TipoProjeto.PUBLICITARIO

     criarProjeto(d:DadosProjeto):Projeto{
          return new ProjetoPublicitario(d.id,d.genero,d.duracaoMin,d.orcamento,d.prazo,d.competencias,undefined,d.estrategia,d.pesos)
               .aplicarAjustes({detalhes:d.detalhes})
     }
     criarValidador():VisitanteProjeto{ return new ValidadorPublicitario() }
     criarRecomendador(base?:RecomendacaoStrategy):RecomendacaoStrategy{ return new RecomendadorPublicitario(base) }
     criarNotificador():Observador{ return new NotificadorPublicitario() }
}
