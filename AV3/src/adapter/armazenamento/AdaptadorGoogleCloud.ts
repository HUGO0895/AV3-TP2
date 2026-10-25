import { randomUUID } from "crypto";
import AdaptadorArmazenamento from "./AdaptadorArmazenamento";
import SistemaArmazenamentoExterno from "./simuladores/SistemaArmazenamentoExterno";
import SimuladorGoogleCloud from "./simuladores/SimuladorGoogleCloud";
import { caminhoDoArquivo } from "./auxiliaresArmazenamento";

export default class AdaptadorGoogleCloud implements AdaptadorArmazenamento{
    constructor(private sistema:SistemaArmazenamentoExterno=new SimuladorGoogleCloud()){}
    salvarArquivo(conteudo:Buffer,metadados:any):string{
        const id=caminhoDoArquivo(metadados,randomUUID())
        this.sistema.upload(id,conteudo)
        return id
    }
    recuperarArquivo(id:string):Buffer{ return this.sistema.download(id) }
    listarArquivos(prefixo:string):string[]{ return this.sistema.listar(prefixo) }
}
