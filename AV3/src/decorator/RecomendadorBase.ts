import { Papel } from "../Equipe/Enum/papel";
import Profissional from "../Equipe/Modelo/Profissional";
import Projeto from "../Projetos/Modelo/projetos";
import RecomendacaoStrategy from "../Strategy/RecomendacaoStrategy";
import SimiliaridadeCosseno from "../Strategy/SimiliaridadedeCosseno";

/**
 * Componente concreto do Decorator: a lógica principal de recomendação (a mesma da atividade 1).
 * Por padrão usa similaridade de cosseno; aceita qualquer estratégia, sem ser modificado pelos decorators.
 */
export default class RecomendadorBase implements RecomendacaoStrategy{
    constructor(private estrategia:RecomendacaoStrategy=new SimiliaridadeCosseno()){}
    recomendar(projeto:Projeto,profissionais:Array<Profissional>):Map<Papel,Profissional>{
        return this.estrategia.recomendar(projeto,profissionais)
    }
}
