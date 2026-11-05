export interface PostOffice {
  name: string;
  officeType: string;
  deliveryStatus: string;
}

export interface PincodeData {
  pincode: string;
  state: string;
  district: string;
  postOffices: PostOffice[];
}

export interface PincodeApiResponse {
  success: boolean;
  data?: PincodeData;
  message?: string;
}

/**
 * Calls the Prajna backend proxy to auto-detect location from the Government of India OGD All India Pincode Directory.
 * Never calls external APIs directly from the browser.
 */
export async function fetchPincodeDetails(pincode: string): Promise<PincodeApiResponse> {
  const cleanPin = pincode.trim().replace(/\D/g, "");

  if (cleanPin.length !== 6) {
    return {
      success: false,
      message: "Please enter a valid 6-digit pincode.",
    };
  }

  try {
    let res = await fetch(`/api/pincode/${cleanPin}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok && res.status === 404) {
      // Fallback query parameter route
      res = await fetch(`/api/pincode?pincode=${cleanPin}`, {
        headers: { Accept: "application/json" },
      });
    }

    const data: PincodeApiResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: "We couldn't verify the pincode right now. Please try again.",
    };
  }
}
