import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}





export interface Client {
  /**
   * Construct and simulate a record_log transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  record_log: ({action}: {action: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a fetch_feedback transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fetch_feedback: ({id}: {id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a create_feedback transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_feedback: ({feedback_msg}: {feedback_msg: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a secure_audit_sync transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  secure_audit_sync: ({audit_contract_address, log_data}: {audit_contract_address: string, log_data: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAKcmVjb3JkX2xvZwAAAAAAAQAAAAAAAAAGYWN0aW9uAAAAAAAQAAAAAA==",
        "AAAAAAAAAAAAAAAOZmV0Y2hfZmVlZGJhY2sAAAAAAAEAAAAAAAAAAmlkAAAAAAAEAAAAAQAAABA=",
        "AAAAAAAAAAAAAAAPY3JlYXRlX2ZlZWRiYWNrAAAAAAEAAAAAAAAADGZlZWRiYWNrX21zZwAAABAAAAABAAAABA==",
        "AAAAAAAAAAAAAAARc2VjdXJlX2F1ZGl0X3N5bmMAAAAAAAACAAAAAAAAABZhdWRpdF9jb250cmFjdF9hZGRyZXNzAAAAAAATAAAAAAAAAAhsb2dfZGF0YQAAABAAAAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    record_log: this.txFromJSON<null>,
        fetch_feedback: this.txFromJSON<string>,
        create_feedback: this.txFromJSON<u32>,
        secure_audit_sync: this.txFromJSON<null>
  }
}