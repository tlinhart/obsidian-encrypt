import { MarkdownView, Notice, TFile, View, WorkspaceLeaf } from "obsidian";
import { FileData, FileDataHelper, JsonFileEncoding } from "./services/FileDataHelper";
import { IPasswordAndHint, SessionPasswordService } from "./services/SessionPasswordService";
import PluginPasswordModal from "./PluginPasswordModal";

export class EncryptedMarkdownView extends MarkdownView {

    static VIEW_TYPE = 'meld-encrypted-view';

    passwordAndHint : IPasswordAndHint | null = null;
    isEncrypted : boolean = false;

    encryptedData : FileData | null = null;

    override getViewType(): string {
        return EncryptedMarkdownView.VIEW_TYPE;
    }

    async onLoadFile(file: TFile): Promise<void> {
        //console.debug('onLoadFile', {file});
        this.isEncrypted = file.extension == 'mymd';
        await super.onLoadFile(file);
    }

    override setViewData(data: string, clear: boolean): void {
        // something is setting the view data, perhaps from reading from the file
        //console.debug('setViewData', {data, clear});

        if (this.file == null) {
            super.setViewData(data, clear);
            return;
        }

        // try to decode data
        if ( JsonFileEncoding.isEncoded(data) ){
            this.encryptedData = JsonFileEncoding.decode( data );
            
            this.passwordAndHint = SessionPasswordService.getByFile( this.file );
            this.passwordAndHint.hint = this.encryptedData.hint;
            // kick off decryption task
            console.debug( 'Decrypting file content' );
            this.tryDecryptingFileContent();
        }else{
            console.debug('setting plain view data', {data});
            super.setViewData(data, clear);
        }
        

    }

    async tryDecryptingFileContent() : Promise<void> {

        if (this.encryptedData == null) {
            new Notice('encryptedData == null');
            return;
        }

        if (this.passwordAndHint == null) {
            new Notice('passwordAndHint == null');
            return;
        }

        if (this.file == null) {
            new Notice('file == null');
            return;
        }

        // try to decrypt the file content
		const decryptedText = await FileDataHelper.decrypt( this.encryptedData, this.passwordAndHint.password );
        //console.debug('decryptedText', decryptedText);
        
        if ( decryptedText == null) {
            // decryption failed, try to prompt user for password
            const pwm = new PluginPasswordModal(
                this.app,
                'Decrypt Note',
                false,
                false,
                this.passwordAndHint!
            );
            this.passwordAndHint = await pwm.openAsync();

            await this.tryDecryptingFileContent();
            
            return;
        }else{
            // decryption succeeded
            
            // save the password in the cache
            SessionPasswordService.putByFile( this.passwordAndHint, this.file );
            
            // set the view data
            super.setViewData( decryptedText, false );

            console.debug( 'file content decrypted' );

            return;
        }
    }
    
    override getViewData(): string {
        // something is reading the data.. maybe to save it

        if( !this.isEncrypted ){
            return super.getViewData();
        }

        return JsonFileEncoding.encode( this.encryptedData! );
    }
   
    override async save(clear?: boolean | undefined): Promise<void> {
        //console.debug('save', { isEncrypted: this.isEncrypted, file:this.file});

        if (!this.isEncrypted) {
            await super.save(clear);
            return;
        }

        const dataToSave = super.getViewData();

        // build up-to-date encrypted data
        this.encryptedData = await FileDataHelper.encrypt(
            this.passwordAndHint!.password,
            this.passwordAndHint!.hint,
            dataToSave
        );

        console.debug( 'file content encrypted, calling save' );

        // call the real save.. which will call getViewData
        await super.save(clear);
        
    }

}

