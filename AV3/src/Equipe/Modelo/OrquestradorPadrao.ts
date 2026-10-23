import Projeto from "../../Projetos/Modelo/projetos";
import { papeisDoProjeto } from "../../Strategy/auxiliares";
import { logEstruturado } from "../../logger";
import { Papel } from "../Enum/papel";
import Equipe from "./equipe";
import MembroEquipe from "./membroEquipe";
import OrquestradorEquipe from "./OrquestradorEquipe";
import Profissional from "./Profissional";

export default class OrquestradorPadrao extends OrquestradorEquipe{
    validarRestricoes(projeto: Projeto): boolean {
        return !!projeto.competencias && projeto.competencias.size>0 && projeto.orcamento>0
    }

    normalizarDados(profissionais:Map<Papel,Profissional>):Equipe{
            const membrosEquipe:Array<MembroEquipe>=[]
            for(const [papel,profissional] of profissionais){
                 // Sugestão ainda não aceita pelo profissional: confirmado=false.
                 membrosEquipe.push(new MembroEquipe(papel,false,profissional))
            }
            return new Equipe(new Date(),'formada',membrosEquipe)
    }

    posProcessar(recomendacao:Equipe,projeto?:Projeto):void{
         if(projeto){
              const preenchidos=new Set(recomendacao.membrosEquipe.map((m)=>m.papel))
              const faltando=papeisDoProjeto(projeto).filter((p)=>!preenchidos.has(p))
              const custo=recomendacao.membrosEquipe.reduce((acu,m)=>acu+m.profissional.precoMedio,0)
              if(faltando.length>0) recomendacao.status='parcial'
              else if(custo>projeto.orcamento) recomendacao.status='acima_do_orcamento'
         }
         logEstruturado("info","equipe_processada",{
              status:recomendacao.status,
              membros:recomendacao.membrosEquipe.map((m)=>({papel:m.papel,profissionalId:m.profissional.getId()})),
         })
    }
}
