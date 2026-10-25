import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";

/** Decorator abstrato: mesma interface da estratégia + referência ao objeto envolvido (delegação padrão). */
export default abstract class DecoratorRecomendacao implements RecomendacaoStrategy{
    constructor(protected readonly strategy:RecomendacaoStrategy){}
    recomendar(projeto:Projeto,profissionais:Array<Profissional>):Map<Papel,Profissional>{
        return this.strategy.recomendar(projeto,profissionais)
    }
}
