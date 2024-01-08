import { Injectable } from '@angular/core';
import {Camera, CameraResultType, CameraSource, Photo} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
   }


  public async addNewToGallery(){
    // Take a photo
    const capturePhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });

    // Save the picture and add it to photo collection
    const savedImageFile = await this.savePicture(capturePhoto) as UserPhoto;
    this.photos.unshift(savedImageFile);

    this.photos.unshift({
      filePath: "soon...",
      webViewPath: capturePhoto.webPath!
    });

    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  };

  private async savePicture(photo: Photo) {
    // Convert photo to base64 format, required by Filesystem API save
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (this.platform.is('hybrid')) {
      // Display the new image rewriting the 'file://' path to HTTP
      return {
        filepath: savedFile.uri,
        webViewPath: Capacitor.convertFileSrc(savedFile.uri),
      }
    } else {
      // Use webpath to display the new image iinstead of base64 since it's
      // already loaded into memory
      return {
        filePath: fileName,
        webview: photo.webPath
      }
    }
  };

  private async readAsBase64(photo: Photo) {
    if (this.platform.is('hybrid')) {
      // Read the file into base64 format
      const file = await Filesystem.readFile({
        path: photo.path!
      });

      return file.data;

    } else {
      // Fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();

      return await this.convertBlobToBase64(blob) as string;
  }
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  public async loadSaved(){
    const {value} = await Preferences.get({key: this.PHOTO_STORAGE});
    this.photos = (value ? JSON.parse(value):[]) as UserPhoto[];

    // When platform is not hybrid
    if(!this.platform.is('hybrid')) {

      // Display the photo by reading into base64 format
      for (let photo of this.photos){
        // Read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filePath,
          directory: Directory.Data
        });

        // Web platfrom only: Load the photo as base64 data
        photo.webViewPath = `data:image/jpeg;base64,${readFile.data}`;
      };
    };
  };


};


export interface UserPhoto{
  filePath: string,
  webViewPath?: string
};
