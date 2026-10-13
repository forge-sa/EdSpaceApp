import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Like the website, images are resized on the device before upload: phone
// photos are 5–10 MB, and the server has no image library of its own. This
// also turns HEIC photos into JPEGs, which the server accepts.

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
}

const GIF_LIMIT = 8 * 1024 * 1024;

/**
 * Scales an image so its longest side is at most `max` px. With `aspect`
 * (width / height) it is center-cropped to that shape first.
 */
export async function prepareImage(
  asset: ImagePicker.ImagePickerAsset,
  { max = 2048, aspect }: { max?: number; aspect?: number } = {},
): Promise<UploadFile> {
  // Keep animated GIFs as they are (if small enough).
  if (asset.mimeType === 'image/gif' && !aspect) {
    if (asset.fileSize && asset.fileSize > GIF_LIMIT) throw new Error('GIFs must be under 8 MB');
    return { uri: asset.uri, name: 'image.gif', type: 'image/gif', width: asset.width, height: asset.height };
  }

  // Decode once to learn the upright size (EXIF rotation applied), then crop and scale that.
  const original = await ImageManipulator.manipulate(asset.uri).renderAsync();
  let sx = 0, sy = 0, sw = original.width, sh = original.height;
  if (aspect) {
    if (sw / sh > aspect) {
      const w = Math.round(sh * aspect);
      sx = Math.round((sw - w) / 2);
      sw = w;
    } else {
      const h = Math.round(sw / aspect);
      sy = Math.round((sh - h) / 2);
      sh = h;
    }
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const ctx = ImageManipulator.manipulate(original);
  if (aspect) ctx.crop({ originX: sx, originY: sy, width: sw, height: sh });
  if (scale < 1) ctx.resize({ width: Math.max(1, Math.round(sw * scale)), height: Math.max(1, Math.round(sh * scale)) });
  const rendered = await ctx.renderAsync();
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.86 });
  return { uri: out.uri, name: 'image.jpg', type: 'image/jpeg', width: out.width, height: out.height };
}

type Source = 'library' | 'camera';

/** Opens the photo library (or camera); returns [] if cancelled or not allowed. */
export async function pickImages(
  source: Source,
  { multiple = false, limit = 1 }: { multiple?: boolean; limit?: number } = {},
): Promise<ImagePicker.ImagePickerAsset[]> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Allow camera access in Settings to take a photo');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    return res.canceled ? [] : res.assets;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // quality 1 keeps animated GIFs animated on Android; we compress ourselves.
    quality: 1,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? limit : 1,
    orderedSelection: true,
  });
  return res.canceled ? [] : res.assets;
}

/**
 * Appends a local file to multipart form data. Expo installs its own fetch as
 * the global one, which reads file parts through expo-file-system; it does not
 * support React Native's old `{ uri, name, type }` parts.
 */
export function appendFile(form: FormData, field: string, file: UploadFile) {
  form.append(field, new File(file.uri) as unknown as Blob);
}
