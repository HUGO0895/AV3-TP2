import { ErroNegocio } from "../../../erros";
import SistemaArmazenamentoExterno from "./SistemaArmazenamentoExterno";

/** Simula o Google Cloud Storage com a "forma" própria do provedor (blobs por nome). */
export default class SimuladorGoogleCloud implements SistemaArmazenamentoExterno{
    private blobs=new Map<string,Buffer>()
    upload(caminho:string,dados:Buffer):void{
        this.blobs.set(caminho,Buffer.from(dados))
    }
    download(caminho:string):Buffer{
        const blob=this.blobs.get(caminho)
        if(!blob) throw new ErroNegocio(`GCS: blob não encontrado (${caminho})`)
        return Buffer.from(blob)
    }
    listar(pasta:string):string[]{
        return Array.from(this.blobs.keys()).filter((k)=>k.startsWith(pasta)).sort()
    }
}
