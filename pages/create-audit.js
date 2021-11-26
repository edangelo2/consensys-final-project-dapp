/* pages/create-audit.js */
import { useState } from 'react'
import { ethers } from 'ethers'
//  Ipfd client for uploading and downloading files
import { create as ipfsHttpClient } from 'ipfs-http-client'
// module for navigation between the pages of the site
import { useRouter } from 'next/router'
/* Ethereum provider solution for all Wallets
* Web3Modal is an easy-to-use library to help developers 
* add support for multiple providers in their apps with a simple customizable configuration
*/
import Web3Modal from 'web3modal'

// IPFS pinning service from infura
const ipfsClient = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import {
    auditItemAddress, DAuditaddress
} from '../config'

import AuditItem from '../contracts/AuditItem.json'
import DAudit from '../contracts/DAudit.json'

export default function CreateAuditItem() {
  // Variables for loading the files  
  const [fileUrl, setFileUrl] = useState(null)
  // Variables for local state of the page in the form (form)
  const [formInput, updateFormInput] = useState({ auditFee: '', name: '', description: '', reqAuditors: '' })
  // router hook
  const router = useRouter()

  // Function for uploading the file
  async function onChange(e) {
    // receives an event with an array of files, pick up the first  
    const file = e.target.files[0]
    try {
      // adds the file to the IPFS thrugh the IPFS client  
      const added = await ipfsClient.add(
        file,
        // Logs the progress of file uploaded in the console
        {
          progress: (prog) => console.log(`received: ${prog}`)
        }
      )
      // saves the IPFS URL returned by the IPFS client
      const url = `https://ipfs.infura.io/ipfs/${added.path}`

      // Set file url to the state variable
      setFileUrl(url)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }  
  }
  async function createAudit() {
    // grab variables from fromInput  
    const { name, description, auditFee } = formInput
    // check that are non-empty
    if (!name || !description || !auditFee || !fileUrl) return
    // Build the metaData as a JSON Object
    const metaData = JSON.stringify({
      name, description, image: fileUrl
    })
    try {
      // Add the metadata through the IPFS Client 
      const added = await ipfsClient.add(metaData)
      // get its url
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      /* after file is uploaded to IPFS, pass the URL to save it on-chain */
      createItem(url)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }  
  }

  async function createItem(url) {

    /* Check the presence of Metamask */
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      window.alert('Metamask is not installed')
      return
    } 
    // Connect to the wallet
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    // Obtain the wallet provider and the signer of the transaction
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()

    /* Create the AuditItem */

    // Reference to the AuditItem Smart Contract
    let contract = new ethers.Contract(auditItemAddress, AuditItem.abi, signer)
    // Call the createToken function to create a new NFT with the url of the image
    let transaction = await contract.createToken(url)
    //Wait for the transaction to succeed
    let tx = await transaction.wait()
    // The tx returns and Event which is an array
    let event = tx.events[0]
    // The second value of the array is the tokenId
    let value = event.args[2]
    // The TokenId is a BigNumber, we convert it to a number
    let tokenId = value.toNumber()

    // Convert the auditFee from the form to ether
    const auditFeeInput = ethers.utils.parseUnits(formInput.auditFee, 'ether')
    // Convert the form field to number
    const reqAuditors = parseInt(formInput.reqAuditors)

    /* then list the item for audit on DAudit */
    // Reference to the DAudit Smart Contract
    contract = new ethers.Contract(DAuditaddress, DAudit.abi, signer)

    // PayFee required from the is a combination of the listigFee + the audit Fee
    // should we write this code client-side, i don't think so (review)
    let listingFee = await contract.getListingFee()
    let auditFee = auditFeeInput
    let payFee = listingFee.add(auditFee)
    let payFeeStr = payFee.toString()

    // Creates the audit Item in the blockchain
    transaction = await contract.createAuditItem(auditItemAddress, tokenId, auditFee, reqAuditors, { value: payFeeStr })
    await transaction.wait()

    // Send the user to the home page
    router.push('/')
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input 
          placeholder="Audit Name"
          className="mt-4 border rounded p-2"
          onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
        />
        <textarea
          placeholder="Audit Description"
          className="mt-1 border rounded p-2"
          onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
        />
        <input
          placeholder="Audit Fee (in Eth)"
          className="mt-1 border rounded p-2"
          onChange={e => updateFormInput({ ...formInput, auditFee: e.target.value })}
        />
        <input
          placeholder="Required Auditors"
          className="mt-1 border rounded p-2"
          onChange={e => updateFormInput({ ...formInput, reqAuditors: e.target.value })}
        />
        <input
          type="file"
          name="Asset"
          className="my-4"
          onChange={onChange}
        />
        {
          fileUrl && (
            <img className="rounded mt-4" width="350" src={fileUrl} />
          )
        }
        <button onClick={createAudit} className="font-bold mt-4 bg-green-700 text-white rounded p-4 shadow-lg">
          Create Audit Request
        </button>
      </div>
    </div>
  )
}