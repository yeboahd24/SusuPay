import { useState } from 'react';
import { useReferrals, useShareLink } from '../../hooks/useViral';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function Referrals() {
  const { data: referrals, isLoading: refLoading } = useReferrals();
  const { data: shareLink, isLoading: shareLoading } = useShareLink();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (refLoading || shareLoading) return <LoadingSpinner className="mt-20" />;

  function copyCode() {
    if (!referrals?.referral_code) return;
    navigator.clipboard.writeText(referrals.referral_code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }

  function copyLink() {
    if (!shareLink?.invite_url) return;
    navigator.clipboard.writeText(shareLink.invite_url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Grow Your Network</h1>

      {/* Share Section */}
      {shareLink && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-primary-900 mb-2">Invite Clients via WhatsApp</h2>
          <p className="text-sm text-primary-700 mb-4">
            Share your group link directly to WhatsApp. Clients can join with one tap.
          </p>

          <div className="space-y-3">
            {/* WhatsApp share button */}
            <a
              href={shareLink.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20bd5a] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share via WhatsApp
            </a>

            {/* Copy link button */}
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-primary-700 font-medium rounded-xl border border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copiedLink ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>
      )}

      {/* Referral Code */}
      {referrals && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Refer Other Collectors</h2>
          <p className="text-sm text-gray-500 mb-3">
            Know other susu collectors? Share your referral code and help them go digital too.
          </p>

          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <code className="flex-1 text-sm font-mono font-semibold text-gray-800">{referrals.referral_code}</code>
            <button
              onClick={copyCode}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg bg-white border border-primary-200"
            >
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Referral stats */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Your Referrals</p>
              <span className="text-lg font-bold text-primary-600">{referrals.total_referrals}</span>
            </div>

            {referrals.referral_names.length > 0 && (
              <div className="space-y-1.5">
                {referrals.referral_names.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-700">{name[0]}</span>
                    </div>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
