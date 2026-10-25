import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ErroNegocio } from "../../../erros";
import SistemaArmazenamentoExterno from "./SistemaArmazenamentoExterno";

/**
 * Armazenamento em disco. Usa `path`/`os` (nunca separadores fixos) para funcionar igual em
 * Windows 10+ e Linux (Ubuntu e derivadas). Os caminhos lógicos usam sempre "/".
 */
export default class SimuladorLocal implements SistemaArmazenamentoExterno{
    constructor(private raiz:string=path.join(os.tmpdir(),"cinebridge-armazenamento")){}

    private resolver(caminho:string):string{
        const destino=path.resolve(this.raiz,...caminho.split("/"))
        const relativo=path.relative(path.resolve(this.raiz),destino)
        if(relativo.startsWith("..") || path.isAbsolute(relativo)) throw new ErroNegocio(`Caminho fora da pasta de armazenamento: ${caminho}`)
        return destino
    }
    upload(caminho:string,dados:Buffer):void{
        const destino=this.resolver(caminho)
        fs.mkdirSync(path.dirname(destino),{recursive:true})
        fs.writeFileSync(destino,dados)
    }
    download(caminho:string):Buffer{
        const destino=this.resolver(caminho)
        if(!fs.existsSync(destino)) throw new ErroNegocio(`Arquivo local não encontrado (${caminho})`)
        return fs.readFileSync(destino)
    }
    listar(pasta:string):string[]{
        const base=path.resolve(this.raiz)
        if(!fs.existsSync(base)) return []
        const achados:string[]=[]
        const percorrer=(dir:string)=>{
            for(const e of fs.readdirSync(dir,{withFileTypes:true})){
                const completo=path.join(dir,e.name)
                if(e.isDirectory()) percorrer(completo)
                else achados.push(path.relative(base,completo).split(path.sep).join("/"))
            }
        }
        percorrer(base)
        return achados.filter((a)=>a.startsWith(pasta)).sort()
    }
}
