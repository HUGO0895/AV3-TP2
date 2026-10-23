import Equipe from "../Equipe/Modelo/equipe"

export const TiposEvento = {
    RECOMENDACAO: "Recomendação de Equipe",
    CONVITE_ACEITO: "Convite Aceito",
    CONVITE_RECUSADO: "Convite Recusado",
    MEMBRO_SUBSTITUIDO: "Membro Substituído",
    EQUIPE_CONFIRMADA: "Equipe Confirmada",
} as const

export default class EventoRecomendacao{
    tipo:string
    dados:Equipe
    origem:string
    detalhes?:Record<string,unknown>
    constructor(tipo:string,dados:Equipe,origem:string,detalhes?:Record<string,unknown>){
           this.tipo=tipo
           this.origem=origem
           this.dados=dados
           this.detalhes=detalhes
    }
}
