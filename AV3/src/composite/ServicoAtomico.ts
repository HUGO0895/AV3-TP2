import { Papel } from "../Equipe/Enum/papel";
import ServicoProjeto from "./ServicoProjeto";

/** Folha do Composite: serviço individual (ex.: edição de vídeo, mixagem) com custo, prazo e papel técnico. */
export default class ServicoAtomico implements ServicoProjeto{
    constructor(
        public readonly nome:string,
        private custo:number,
        private prazo:Date,
        public readonly papel:Papel
    ){}
    calcularCusto():number{ return this.custo }
    listarSubservicos():ServicoProjeto[]{ return [] }
    obterPrazo():Date[]{ return [new Date(this.prazo)] }
    validar():boolean{
        return Number.isFinite(this.custo) && this.custo>=0
            && this.prazo instanceof Date && !Number.isNaN(this.prazo.getTime())
            && Object.values(Papel).includes(this.papel)
    }
}
