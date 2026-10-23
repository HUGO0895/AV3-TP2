import { logEstruturado } from '../../logger'
import EventoRecomendacao from '../../Observer/EventoRecomendacao'
import Observador from '../../Observer/Observador'

/** Observer cujo texto e rótulo dependem do tipo de projeto. */
export default abstract class NotificadorEspecializado implements Observador{
     protected abstract readonly rotulo:string
     protected abstract mensagem(evento:EventoRecomendacao):string

     atualizar(evento:EventoRecomendacao):void{
          logEstruturado('info','notificacao_tipo',{
               observador:this.rotulo,
               tipoEvento:evento.tipo,
               membros:evento.dados.membrosEquipe.length,
               mensagem:this.mensagem(evento),
          })
     }
}
