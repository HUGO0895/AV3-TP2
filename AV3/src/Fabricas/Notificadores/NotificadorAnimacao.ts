import EventoRecomendacao from '../../Observer/EventoRecomendacao'
import NotificadorEspecializado from './NotificadorEspecializado'

export default class NotificadorAnimacao extends NotificadorEspecializado{
     protected readonly rotulo='NOTIFICADOR-ANIMACAO'
     protected mensagem(evento:EventoRecomendacao):string{
          return `[Animação] ${evento.tipo}: avise o estúdio para reservar a fila de renderização`
     }
}
