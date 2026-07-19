import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
if (typeof window !== "undefined") {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAAAAAAAAAAAKcmVjb3JkX2xvZwAAAAAAAQAAAAAAAAAGYWN0aW9uAAAAAAAQAAAAAA==",
            "AAAAAAAAAAAAAAAOZmV0Y2hfZmVlZGJhY2sAAAAAAAEAAAAAAAAAAmlkAAAAAAAEAAAAAQAAABA=",
            "AAAAAAAAAAAAAAAPY3JlYXRlX2ZlZWRiYWNrAAAAAAEAAAAAAAAADGZlZWRiYWNrX21zZwAAABAAAAABAAAABA==",
            "AAAAAAAAAAAAAAARc2VjdXJlX2F1ZGl0X3N5bmMAAAAAAAACAAAAAAAAABZhdWRpdF9jb250cmFjdF9hZGRyZXNzAAAAAAATAAAAAAAAAAhsb2dfZGF0YQAAABAAAAAA"]), options);
        this.options = options;
    }
    fromJSON = {
        record_log: (this.txFromJSON),
        fetch_feedback: (this.txFromJSON),
        create_feedback: (this.txFromJSON),
        secure_audit_sync: (this.txFromJSON)
    };
}
